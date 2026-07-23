import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { marketplaceSeed } from "../data/marketplaceData";

const MarketplaceContext = createContext(null);
const STORAGE_KEY = "ain_marketplace_v1";

function createId(prefix) {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() || Date.now()}`;
}

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return marketplaceSeed;
    const parsed = JSON.parse(saved);
    const courses = (parsed.courses || []).map((course) => ({
      ...marketplaceSeed.courses.find((seed) => seed.id === course.id),
      ...course
    }));
    return { ...marketplaceSeed, ...parsed, courses };
  } catch {
    return marketplaceSeed;
  }
}

export function MarketplaceProvider({ children }) {
  const [data, setData] = useState(loadData);

  const commit = useCallback((next) => {
    setData(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const add = useCallback((key, prefix, payload) => {
    const entity = { id: createId(prefix), createdAt: new Date().toISOString(), ...payload };
    commit({ ...data, [key]: [entity, ...data[key]] });
    return entity;
  }, [commit, data]);

  const update = useCallback((key, id, changes) => {
    commit({ ...data, [key]: data[key].map((item) => item.id === id ? { ...item, ...changes, updatedAt: new Date().toISOString() } : item) });
  }, [commit, data]);

  const createBooking = useCallback((payload) => {
    const duplicate = data.bookings.find((item) => item.courseId === payload.courseId && item.email === payload.email && !["cancelled", "rejected", "expired"].includes(item.status));
    if (duplicate) return { ok: false, reason: "duplicate", booking: duplicate };
    const batch = data.batches.find((item) => item.id === payload.batchId);
    if (!batch || batch.status !== "open" || batch.confirmedSeats + batch.reservedSeats >= batch.capacity) return { ok: false, reason: "capacity_full" };
    const booking = { id: createId("booking"), status: "pending_confirmation", paymentStatus: "unpaid", createdAt: new Date().toISOString(), ...payload };
    const notification = { id: createId("notification"), userId: booking.studentId || booking.email, email: booking.email, type: "booking_submitted", title: "Booking request submitted", titleAr: "تم إرسال طلب الحجز", body: "The academy will review your request.", bodyAr: "ستراجع الأكاديمية طلبك وتتواصل معك للتأكيد.", target: "/end-user/courses", unread: true, createdAt: new Date().toISOString() };
    commit({ ...data, bookings: [booking, ...data.bookings], notifications: [notification, ...(data.notifications || [])], batches: data.batches.map((item) => item.id === batch.id ? { ...item, reservedSeats: item.reservedSeats + 1 } : item) });
    return { ok: true, booking };
  }, [commit, data]);

  const confirmBooking = useCallback((bookingId) => {
    const booking = data.bookings.find((item) => item.id === bookingId);
    if (!booking) return { ok: false, reason: "not_found" };
    if (booking.status === "confirmed") return { ok: true, unchanged: true };
    const batch = data.batches.find((item) => item.id === booking.batchId);
    if (!batch || batch.confirmedSeats >= batch.capacity) return { ok: false, reason: "capacity_full" };
    const enrollmentId = `enrollment-${booking.id}`;
    const subscriptionId = `subscription-${booking.id}`;
    const membershipId = `room-membership-${booking.id}`;
    const enrollment = { id: enrollmentId, organizationId: booking.organizationId, courseId: booking.courseId, batchId: booking.batchId, studentId: booking.studentId || booking.email, bookingId: booking.id, roomMembershipId: membershipId, subscriptionId, status: "active", accessStartsAt: batch.startDate, accessEndsAt: batch.endDate };
    const subscription = { id: subscriptionId, organizationId: booking.organizationId, studentId: booking.studentId || booking.email, courseId: booking.courseId, status: "active", startDate: batch.startDate, endDate: batch.endDate };
    const roomMembership = { id: membershipId, organizationId: booking.organizationId, roomId: batch.roomId, userId: booking.studentId || booking.email, role: "student", status: "active" };
    const notification = { id: createId("notification"), userId: booking.studentId || booking.email, email: booking.email, type: "booking_confirmed", title: "Booking confirmed", titleAr: "تم تأكيد حجزك", body: "Your course workspace is ready.", bodyAr: "مساحة الكورس جاهزة ويمكنك فتحها الآن.", target: "/end-user/courses", unread: true, createdAt: new Date().toISOString() };
    commit({
      ...data,
      bookings: data.bookings.map((item) => item.id === booking.id ? { ...item, status: "confirmed", confirmedAt: new Date().toISOString() } : item),
      batches: data.batches.map((item) => item.id === batch.id ? { ...item, confirmedSeats: item.confirmedSeats + 1, reservedSeats: Math.max(0, item.reservedSeats - 1) } : item),
      enrollments: data.enrollments.some((item) => item.id === enrollmentId) ? data.enrollments : [enrollment, ...data.enrollments],
      subscriptions: data.subscriptions.some((item) => item.id === subscriptionId) ? data.subscriptions : [subscription, ...data.subscriptions],
      roomMemberships: data.roomMemberships.some((item) => item.id === membershipId) ? data.roomMemberships : [roomMembership, ...data.roomMemberships],
      notifications: [notification, ...(data.notifications || [])]
    });
    return { ok: true, enrollment };
  }, [commit, data]);

  const rejectBooking = useCallback((bookingId) => {
    const booking = data.bookings.find((item) => item.id === bookingId);
    if (!booking || booking.status === "confirmed") return { ok: false };
    const notification = { id: createId("notification"), userId: booking.studentId || booking.email, email: booking.email, type: "booking_rejected", title: "Booking update", titleAr: "تحديث على طلب الحجز", body: "The academy could not confirm this booking.", bodyAr: "تعذر على الأكاديمية تأكيد هذا الحجز. يمكنك اختيار دفعة أخرى.", target: "/end-user/courses", unread: true, createdAt: new Date().toISOString() };
    commit({ ...data, bookings: data.bookings.map((item) => item.id === bookingId ? { ...item, status: "rejected" } : item), notifications: [notification, ...(data.notifications || [])], batches: data.batches.map((item) => item.id === booking.batchId ? { ...item, reservedSeats: Math.max(0, item.reservedSeats - 1) } : item) });
    return { ok: true };
  }, [commit, data]);

  const cancelBooking = useCallback((bookingId) => {
    const booking = data.bookings.find((item) => item.id === bookingId);
    if (!booking || ["cancelled", "rejected"].includes(booking.status)) return { ok: false };
    const wasConfirmed = booking.status === "confirmed";
    const notification = {
      id: createId("notification"),
      userId: booking.studentId || booking.email,
      email: booking.email,
      type: "booking_cancelled",
      title: "Booking cancelled",
      titleAr: "تم إلغاء الحجز",
      body: "The course reservation and its access have been cancelled.",
      bodyAr: "تم إلغاء حجز الكورس وإيقاف الوصول المرتبط به.",
      target: "/end-user/courses",
      unread: true,
      createdAt: new Date().toISOString()
    };
    commit({
      ...data,
      bookings: data.bookings.map((item) => item.id === bookingId ? { ...item, status: "cancelled", cancelledAt: new Date().toISOString() } : item),
      batches: data.batches.map((item) => item.id === booking.batchId ? {
        ...item,
        confirmedSeats: wasConfirmed ? Math.max(0, item.confirmedSeats - 1) : item.confirmedSeats,
        reservedSeats: wasConfirmed ? item.reservedSeats : Math.max(0, item.reservedSeats - 1)
      } : item),
      enrollments: data.enrollments.map((item) => item.bookingId === bookingId ? { ...item, status: "cancelled" } : item),
      subscriptions: data.subscriptions.map((item) => item.id === `subscription-${bookingId}` ? { ...item, status: "cancelled" } : item),
      roomMemberships: data.roomMemberships.map((item) => item.id === `room-membership-${bookingId}` ? { ...item, status: "cancelled" } : item),
      notifications: [notification, ...(data.notifications || [])]
    });
    return { ok: true };
  }, [commit, data]);

  const value = useMemo(() => ({ ...data, add, update, createBooking, confirmBooking, rejectBooking, cancelBooking }), [add, cancelBooking, confirmBooking, createBooking, data, rejectBooking, update]);
  return <MarketplaceContext.Provider value={value}>{children}</MarketplaceContext.Provider>;
}

export function useMarketplace() {
  const value = useContext(MarketplaceContext);
  if (!value) throw new Error("useMarketplace must be used inside MarketplaceProvider");
  return value;
}
