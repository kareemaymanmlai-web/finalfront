import { AlertTriangle, Building2, CreditCard, Download, MoreVertical, Plus, Shield, TrendingUp, Users } from "lucide-react";
import { useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { AccountSettings } from "../components/AccountSettings";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { FormField } from "../components/FormField";
import { Modal } from "../components/Modal";
import { AppLayout } from "../layouts/AppLayout";
import { useBilingualText } from "../contexts/LanguageContext";
import { api } from "../services/api";
import { ActivityAuditPage, NotificationCenterPage } from "../components/WorkspaceOperations";
import { PlatformOrganizationsPage } from "../components/PlatformOrganizationOperations";
import {
  AcademyApprovalsPage,
  CategoryManagementPage,
  CourseApprovalsPage,
  PromotionsManagementPage
} from "../components/MarketplaceAdminOperations";

const nav = [
  { id: "dashboard", label: "Dashboard", icon: "dashboard", path: "/super-admin/dashboard" },
  { id: "tenants", label: "Tenants", icon: "rooms", path: "/super-admin/tenants" },
  { id: "academies", label: "Academy approvals", icon: "members", path: "/super-admin/academies" },
  { id: "courseApprovals", label: "Course approvals", icon: "courses", path: "/super-admin/courseApprovals" },
  { id: "promotions", label: "Promotion approvals", icon: "announcements", path: "/super-admin/promotions" },
  { id: "categories", label: "Categories", icon: "settings", path: "/super-admin/categories" },
  { id: "revenue", label: "Revenue", icon: "analytics", path: "/super-admin/revenue" },
  { id: "subscriptions", label: "Subscriptions", icon: "subscription", path: "/super-admin/subscriptions" },
  { id: "notifications", label: "Notifications", icon: "notifications", path: "/super-admin/notifications" },
  { id: "pricing", label: "Pricing", icon: "settings", path: "/super-admin/pricing" },
  { id: "activity", label: "Activity", icon: "locked", path: "/super-admin/activity" },
  { id: "settings", label: "Settings", icon: "settings", path: "/super-admin/settings" }
];

export function SuperAdminApp({ data, user }) {
  const { page = "dashboard" } = useParams();
  const tx = useBilingualText();
  const appUser = { ...user, roleLabel: tx("مدير المنصة", "Super Admin"), company: "AIO SaaS Workspace" };

  if (!nav.some((item) => item.id === page)) {
    return <Navigate to="/super-admin/dashboard" replace />;
  }

  return (
    <AppLayout appTitle="Super Admin" user={appUser} nav={nav}>
      {page === "dashboard" && <Dashboard data={data} />}
      {page === "tenants" && <PlatformOrganizationsPage />}
      {page === "academies" && <AcademyApprovalsPage />}
      {page === "courseApprovals" && <CourseApprovalsPage />}
      {page === "promotions" && <PromotionsManagementPage platform />}
      {page === "categories" && <CategoryManagementPage />}
      {page === "revenue" && <RevenuePage />}
      {page === "subscriptions" && <SubscriptionsPage tenants={data.tenants} />}
      {page === "pricing" && <Pricing />}
      {page === "activity" && <ActivityAuditPage />}
      {page === "notifications" && <NotificationCenterPage user={user} />}
      {page === "settings" && <AccountSettings user={user} workspaceLabel="Super Admin workspace" />}
    </AppLayout>
  );
}

function Dashboard({ data }) {
  const [open, setOpen] = useState(false);
  const tx = useBilingualText();

  return (
    <>
      <div className="stitch-page-head">
        <div>
          <h1>{tx("لوحة تحكم مدير المنصة", "Platform overview")}</h1>
          <p>{tx("إدارة الشركات، الإيرادات، الاشتراكات، والتنبيهات التشغيلية من مكان واحد.", "Manage tenants, revenue, subscriptions, and operational alerts from one place.")}</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus size={18} /> {tx("شركة جديدة", "New tenant")}</Button>
      </div>

      <section className="stitch-stat-grid five">
        <StatCard title={tx("الشركات النشطة", "Active tenants")} value="14" hint={tx("+3 هذا الشهر", "+3 this month")} icon={<Building2 />} tone="primary" />
        <StatCard title={tx("الإيرادات الشهرية", "Monthly revenue")} value="42K" hint={tx("+18% عن الشهر", "+18% this month")} icon={<TrendingUp />} tone="success" />
        <StatCard title={tx("اشتراكات تنتهي قريباً", "Expiring subscriptions")} value="5" hint={tx("خلال 7 أيام", "Within 7 days")} icon={<CreditCard />} tone="warning" />
        <StatCard title={tx("إجمالي المستخدمين", "Total users")} value="847" hint={tx("+62 هذا الأسبوع", "+62 this week")} icon={<Users />} tone="primary" />
        <StatCard title={tx("تنبيهات أمنية", "Security alerts")} value="3" hint={tx("تحتاج مراجعة", "Needs review")} icon={<AlertTriangle />} tone="danger" />
      </section>

      <section className="stitch-dashboard-grid super">
        <div className="stitch-performance-card">
          <div className="stitch-card-head">
            <h2>{tx("أحدث الشركات", "Latest tenants")}</h2>
            <a href="/super-admin/tenants">{tx("عرض الكل", "View all")}</a>
          </div>
          {data.tenants.slice(0, 4).map((tenant) => (
            <div className="stitch-room-mini tenant" key={tenant.id}>
              <span className={tenant.status.includes("Expiring") ? "warning" : "success"} />
              <strong>{tenant.name}</strong>
              <small>{tenant.plan} / {tenant.users} {tx("مستخدم", "users")}</small>
              <Badge tone={tenant.status.includes("Expiring") ? "warning" : "success"}>{tenant.status}</Badge>
            </div>
          ))}
        </div>

        <div className="stitch-quick-card">
          <h2>{tx("إجراءات سريعة", "Quick actions")}</h2>
          <button onClick={() => setOpen(true)} type="button"><Plus size={20} /> {tx("إنشاء شركة", "Create tenant")}</button>
          <a href="/super-admin/subscriptions"><CreditCard size={20} /> {tx("مراجعة التجديدات", "Review renewals")}</a>
          <a href="/super-admin/revenue"><Download size={20} /> {tx("تصدير CSV", "Export CSV")}</a>
        </div>

        <div className="stitch-activity-card">
          <h2>Action inbox</h2>
          <ActivityItem tone="warning" title={tx("خطر تجديد", "Renewal risk")} body={tx("5 شركات تنتهي خلال 7 أيام", "5 tenants expire within 7 days")} time={tx("الآن", "Now")} />
          <ActivityItem tone="danger" title={tx("مشكلة دفع", "Payment issue")} body={tx("3 محاولات دفع فاشلة", "3 failed payment attempts")} time={tx("منذ ساعة", "1 hour ago")} />
          <ActivityItem tone="primary" title={tx("مراجعة شركة جديدة", "New tenant review")} body={tx("راجع بيانات الإعداد", "Verify onboarding details")} time={tx("اليوم", "Today")} />
        </div>
      </section>
      <CreateTenantModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function TenantsPage({ tenants }) {
  const [open, setOpen] = useState(false);
  const tx = useBilingualText();
  return (
    <>
      <div className="stitch-page-head">
        <div>
          <h1>{tx("إدارة الشركات", "Tenant management")}</h1>
          <p>{tx("الشركات، الخطط، الحصص، تاريخ الانتهاء، وحالة التشغيل.", "Manage plans, quotas, expiration dates, and tenant status.")}</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus size={18} /> {tx("شركة جديدة", "New tenant")}</Button>
      </div>
      <TenantTable tenants={tenants} />
      <CreateTenantModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function SubscriptionsPage({ tenants }) {
  const tx = useBilingualText();
  return (
    <>
      <div className="stitch-page-head">
        <div>
          <h1>{tx("الاشتراكات", "Subscriptions")}</h1>
          <p>{tx("تتبع التجديدات والاشتراكات الشهرية والسنوية وتصدير التقارير.", "Track renewals, monthly and yearly subscriptions, and export reports.")}</p>
        </div>
        <Button variant="ghost"><Download size={18} /> {tx("تصدير CSV", "Export CSV")}</Button>
      </div>
      <TenantTable tenants={tenants} />
    </>
  );
}

function TenantTable({ tenants }) {
  const tx = useBilingualText();
  return (
    <div className="stitch-table-card">
      <table>
        <thead>
          <tr>
            <th>{tx("الشركة", "Tenant")}</th>
            <th>{tx("الخطة", "Plan")}</th>
            <th>{tx("المستخدمين", "Users")}</th>
            <th>{tx("الملفات", "Files")}</th>
            <th>{tx("الإيراد", "Revenue")}</th>
            <th>{tx("ينتهي في", "Expires")}</th>
            <th>{tx("الحالة", "Status")}</th>
            <th>{tx("إجراءات", "Actions")}</th>
          </tr>
        </thead>
        <tbody>
          {tenants.map((tenant) => (
            <tr key={tenant.id}>
              <td><AvatarName initials={tenant.name.slice(0, 2).toUpperCase()} name={tenant.name} sub={`${tenant.rooms} rooms`} /></td>
              <td>{tenant.plan}</td>
              <td>{tenant.users}</td>
              <td>{tenant.files}</td>
              <td>{tenant.revenue} EGP</td>
              <td>{tenant.expiresAt}</td>
              <td><Badge tone={tenant.status.includes("Expiring") ? "warning" : "success"}>{tenant.status}</Badge></td>
              <td><MoreVertical size={20} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Pricing() {
  const [period, setPeriod] = useState("monthly");
  const tx = useBilingualText();
  const prices = {
    Starter: { monthly: "500", yearly: "4,800" },
    Growth: { monthly: "1,200", yearly: "11,520" },
    Pro: { monthly: "2,500", yearly: "24,000" }
  };

  return (
    <>
      <div className="stitch-page-head">
        <div>
          <h1>{tx("الباقات", "Plans")}</h1>
          <p>{tx("الباقات تعمل شهرياً وسنوياً، والاختيار يغير الأسعار فوراً.", "Switch between monthly and yearly billing to update prices instantly.")}</p>
        </div>
        <div className="stitch-period-toggle">
          <button className={period === "monthly" ? "active" : ""} onClick={() => setPeriod("monthly")} type="button">{tx("شهري", "Monthly")}</button>
          <button className={period === "yearly" ? "active" : ""} onClick={() => setPeriod("yearly")} type="button">{tx("سنوي -20%", "Yearly -20%")}</button>
        </div>
      </div>
      <div className="stitch-pricing-grid">
        {Object.entries(prices).map(([name, price]) => (
          <article className={name === "Growth" ? "stitch-plan-card featured" : "stitch-plan-card"} key={name}>
            {name === "Growth" && <Badge tone="primary">{tx("الأكثر مبيعاً", "Most popular")}</Badge>}
            <h2>{name}</h2>
            <strong>{price[period]} {tx("جنيه", "EGP")} / {period === "monthly" ? tx("شهر", "month") : tx("سنة", "year")}</strong>
            <p>{name === "Starter" ? tx("غرفة واحدة / 100 مستخدم", "1 room / 100 users") : name === "Growth" ? tx("10 غرف / 500 مستخدم / تحليلات", "10 rooms / 500 users / Analytics") : tx("غير محدود / علامة بيضاء / مدفوعات", "Unlimited / White label / Payments")}</p>
            <Button variant={name === "Growth" ? "primary" : "ghost"}>{tx("تعديل", "Edit")}</Button>
          </article>
        ))}
      </div>
    </>
  );
}

function RevenuePage() {
  const tx = useBilingualText();
  return (
    <>
      <div className="stitch-page-head">
        <div>
          <h1>{tx("الإيرادات", "Revenue")}</h1>
          <p>{tx("عرض واضح للإيرادات حسب الخطة والحالة.", "A clear revenue breakdown by plan and status.")}</p>
        </div>
      </div>
      <section className="stitch-stat-grid four">
        <StatCard title={tx("الإيراد الشهري", "Monthly revenue")} value="42K" hint="+18%" icon={<TrendingUp />} tone="success" />
        <StatCard title="Growth" value="9.6K" hint="8 tenants" icon={<CreditCard />} tone="primary" />
        <StatCard title="Pro" value="5K" hint="2 tenants" icon={<Shield />} tone="primary" />
        <StatCard title="Starter" value="3.8K" hint="4 tenants" icon={<Building2 />} tone="warning" />
      </section>
    </>
  );
}

function ActivityPage() {
  const tx = useBilingualText();
  return (
    <>
      <div className="stitch-page-head">
        <div>
          <h1>{tx("سجل النشاط", "Activity log")}</h1>
          <p>{tx("سجل تشغيلي لأحداث المنصة.", "An operational log of platform events.")}</p>
        </div>
      </div>
      <div className="stitch-activity-card">
        <ActivityItem tone="success" title={tx("جددت TechCorp الاشتراك", "TechCorp renewed subscription")} body={tx("تم تجديد باقة Growth", "Growth plan renewal completed")} time={tx("منذ 12 دقيقة", "12 minutes ago")} />
        <ActivityItem tone="primary" title={tx("غيرت Elite Academy الباقة", "Elite Academy changed plan")} body={tx("عدّل مدير المنصة باقة Pro", "Pro plan edited by platform admin")} time={tx("منذ ساعة", "1 hour ago")} />
        <ActivityItem tone="warning" title={tx("معهد اللغات يحتاج للتجديد", "Language Institute needs renewal")} body={tx("الاشتراك ينتهي قريباً", "Subscription expires soon")} time={tx("اليوم", "Today")} />
      </div>
    </>
  );
}

function StatCard({ title, value, hint, icon, tone = "primary" }) {
  return (
    <article className={`stitch-stat-card ${tone}`}>
      <div>
        <span>{title}</span>
        <div className="stitch-stat-icon">{icon}</div>
      </div>
      <strong>{value}</strong>
      <small>{hint}</small>
    </article>
  );
}

function ActivityItem({ title, body, time, tone }) {
  return (
    <div className={`stitch-activity-item ${tone}`}>
      <i />
      <div>
        <strong>{title}</strong>
        <span>{body}</span>
        <small>{time}</small>
      </div>
    </div>
  );
}

function AvatarName({ initials, name, sub }) {
  return (
    <div className="stitch-avatar-name">
      <i>{initials}</i>
      <div>
        <strong>{name}</strong>
        {sub && <small>{sub}</small>}
      </div>
    </div>
  );
}

function CreateTenantModal({ open, onClose }) {
  const [form, setForm] = useState({ name: "", adminEmail: "", plan: "Growth" });
  const tx = useBilingualText();

  const submit = async (event) => {
    event.preventDefault();
    await api.createTenant(form);
    onClose();
  };

  return (
    <Modal title={tx("إنشاء شركة", "Create tenant")} open={open} onClose={onClose} footer={<Button form="create-tenant-form">{tx("إنشاء", "Create")}</Button>}>
      <form id="create-tenant-form" className="form-grid" onSubmit={submit}>
        <FormField label={tx("اسم الشركة", "Tenant name")}><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></FormField>
        <FormField label={tx("بريد المسؤول", "Admin email")}><input type="email" required value={form.adminEmail} onChange={(event) => setForm({ ...form, adminEmail: event.target.value })} /></FormField>
        <FormField label={tx("الخطة", "Plan")}>
          <select value={form.plan} onChange={(event) => setForm({ ...form, plan: event.target.value })}>
            <option>Starter</option>
            <option>Growth</option>
            <option>Pro</option>
          </select>
        </FormField>
      </form>
    </Modal>
  );
}
