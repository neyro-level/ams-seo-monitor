"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { Button } from "../../../components/ui/button.tsx";
import {
  createMembershipInputSchema,
  createOrganizationInputSchema,
  removeMembershipInputSchema,
  provisionClientInputSchema,
  resetUserPasswordInputSchema,
  tenantRoleSchema,
  updateMembershipInputSchema,
  updateOrganizationInputSchema,
  type CreateMembershipInput,
  type CreateOrganizationInput,
  type IdentityAdminFormOptions,
  type MembershipListItem,
  type OrganizationListItem,
  type IdentityAdminUserListItem,
  type ProvisionClientInput,
  type ResetUserPasswordInput,
  type RemoveMembershipInput,
  type UpdateMembershipInput,
  type UpdateOrganizationInput,
} from "../../../modules/identity-access/contracts.ts";
import {
  createMembershipAction,
  createOrganizationAction,
  removeMembershipAction,
  updateMembershipAction,
  updateOrganizationAction,
  provisionClientAction,
  resetUserPasswordAction,
  setUserEnabledAction,
} from "../_actions/identity.ts";
import {
  applyFieldErrors,
  feedbackFrom,
  FormField,
  SectionCard,
  SelectInput,
  SubmitRow,
  TextInput,
  type Feedback,
} from "./platform-admin-form-primitives.tsx";

const tenantRoleOptions = tenantRoleSchema.options.map((value) => ({ value, label: value }));

function OrganizationEditCard({ item }: { item: OrganizationListItem }) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<Feedback>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<UpdateOrganizationInput>({
    resolver: zodResolver(updateOrganizationInputSchema) as Resolver<UpdateOrganizationInput>,
    defaultValues: {
      organizationId: item.id,
      version: item.version,
      slug: item.slug,
      name: item.name,
    },
  });
  const submit = handleSubmit(async (values) => {
    const result = await updateOrganizationAction(values);
    if (!result.ok) {
      applyFieldErrors(result.fieldErrors, setError);
      setFeedback(feedbackFrom(result));
      return;
    }
    setFeedback({ kind: "success", message: "Организация обновлена" });
    router.refresh();
  });

  return (
    <SectionCard
      title={item.name}
      description={`${item.slug} · ${item.projectCount} проектов · ${item.membershipCount} участников`}
    >
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
        <input type="hidden" {...register("organizationId")} />
        <input type="hidden" {...register("version", { valueAsNumber: true })} />
        <FormField error={errors.name?.message} label="Название" required>
          <TextInput {...register("name")} />
        </FormField>
        <FormField error={errors.slug?.message} label="Slug" required>
          <TextInput {...register("slug")} />
        </FormField>
        <div className="sm:col-span-2">
          <SubmitRow busy={isSubmitting} feedback={feedback} label="Сохранить" onRefresh={() => router.refresh()} pendingLabel="Сохраняем…" />
        </div>
      </form>
    </SectionCard>
  );
}

export function OrganizationsAdminForms({ items }: { items: OrganizationListItem[] }) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<Feedback>(null);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateOrganizationInput>({
    resolver: zodResolver(createOrganizationInputSchema) as Resolver<CreateOrganizationInput>,
    defaultValues: { slug: "", name: "" },
  });
  const submit = handleSubmit(async (values) => {
    const result = await createOrganizationAction(values);
    if (!result.ok) {
      applyFieldErrors(result.fieldErrors, setError);
      setFeedback(feedbackFrom(result));
      return;
    }
    reset({ slug: "", name: "" });
    setFeedback({ kind: "success", message: "Организация создана" });
    router.refresh();
  });

  return (
    <div className="space-y-4">
      <SectionCard title="Создать организацию" description="Новая организация получает version=1 и tenant boundary.">
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
          <FormField error={errors.name?.message} label="Название" required>
            <TextInput {...register("name")} />
          </FormField>
          <FormField error={errors.slug?.message} label="Slug" required>
            <TextInput placeholder="client-name" {...register("slug")} />
          </FormField>
          <div className="sm:col-span-2">
            <SubmitRow busy={isSubmitting} feedback={feedback} label="Создать организацию" onRefresh={() => router.refresh()} pendingLabel="Создаём…" />
          </div>
        </form>
      </SectionCard>
      <div className="grid gap-4 xl:grid-cols-2">
        {items.map((item) => <OrganizationEditCard item={item} key={item.id} />)}
      </div>
    </div>
  );
}

function MembershipEditCard({ item }: { item: MembershipListItem }) {
  const router = useRouter();
  const [updateFeedback, setUpdateFeedback] = useState<Feedback>(null);
  const [removeFeedback, setRemoveFeedback] = useState<Feedback>(null);
  const updateForm = useForm<UpdateMembershipInput>({
    resolver: zodResolver(updateMembershipInputSchema) as Resolver<UpdateMembershipInput>,
    defaultValues: {
      organizationId: item.organizationId,
      membershipId: item.id,
      version: item.version,
      tenantRole: item.tenantRole,
    },
  });
  const removeForm = useForm<RemoveMembershipInput>({
    resolver: zodResolver(removeMembershipInputSchema) as Resolver<RemoveMembershipInput>,
    defaultValues: {
      organizationId: item.organizationId,
      membershipId: item.id,
      version: item.version,
    },
  });

  const submitUpdate = updateForm.handleSubmit(async (values) => {
    const result = await updateMembershipAction(values);
    if (!result.ok) {
      applyFieldErrors(result.fieldErrors, updateForm.setError);
      setUpdateFeedback(feedbackFrom(result));
      return;
    }
    setUpdateFeedback({ kind: "success", message: "Доступ обновлён" });
    router.refresh();
  });

  const submitRemove = removeForm.handleSubmit(async (values) => {
    const result = await removeMembershipAction(values);
    if (!result.ok) {
      applyFieldErrors(result.fieldErrors, removeForm.setError);
      setRemoveFeedback(feedbackFrom(result));
      return;
    }
    setRemoveFeedback({ kind: "success", message: "Доступ отозван" });
    router.refresh();
  });

  return (
    <SectionCard title={item.userName} description={`${item.userEmail} · ${item.organizationName}`}>
      <div className="space-y-4">
        <form className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto]" onSubmit={submitUpdate}>
          <input type="hidden" {...updateForm.register("organizationId")} />
          <input type="hidden" {...updateForm.register("membershipId")} />
          <input type="hidden" {...updateForm.register("version", { valueAsNumber: true })} />
          <FormField error={updateForm.formState.errors.tenantRole?.message} label="Tenant role" required>
            <SelectInput options={tenantRoleOptions} {...updateForm.register("tenantRole")} />
          </FormField>
          <div className="self-end">
            <SubmitRow busy={updateForm.formState.isSubmitting} feedback={updateFeedback} label="Сохранить" onRefresh={() => router.refresh()} pendingLabel="Сохраняем…" variant="outline" />
          </div>
        </form>
        <form className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4" onSubmit={submitRemove}>
          <input type="hidden" {...removeForm.register("organizationId")} />
          <input type="hidden" {...removeForm.register("membershipId")} />
          <input type="hidden" {...removeForm.register("version", { valueAsNumber: true })} />
          <SubmitRow busy={removeForm.formState.isSubmitting} feedback={removeFeedback} label="Отозвать доступ" onRefresh={() => router.refresh()} pendingLabel="Отзываем…" variant="ghost" />
        </form>
      </div>
    </SectionCard>
  );
}

export function MembershipsAdminForms({
  items,
  options,
}: {
  items: MembershipListItem[];
  options: IdentityAdminFormOptions;
}) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<Feedback>(null);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateMembershipInput>({
    resolver: zodResolver(createMembershipInputSchema) as Resolver<CreateMembershipInput>,
    defaultValues: {
      organizationId: options.organizations[0]?.id ?? "",
      userId: options.users[0]?.id ?? "",
      tenantRole: "ORG_MEMBER",
    },
  });
  const submit = handleSubmit(async (values) => {
    const result = await createMembershipAction(values);
    if (!result.ok) {
      applyFieldErrors(result.fieldErrors, setError);
      setFeedback(feedbackFrom(result));
      return;
    }
    reset({
      organizationId: options.organizations[0]?.id ?? "",
      userId: options.users[0]?.id ?? "",
      tenantRole: "ORG_MEMBER",
    });
    setFeedback({ kind: "success", message: "Доступ создан" });
    router.refresh();
  });

  return (
    <div className="space-y-4">
      <SectionCard title="Добавить доступ" description="Membership сразу определяет tenant scope пользователя.">
        <form className="grid gap-4 sm:grid-cols-3" onSubmit={submit}>
          <FormField error={errors.organizationId?.message} label="Организация" required>
            <SelectInput options={options.organizations.map((option) => ({ value: option.id, label: option.name }))} {...register("organizationId")} />
          </FormField>
          <FormField error={errors.userId?.message} label="Пользователь" required>
            <SelectInput options={options.users.map((option) => ({ value: option.id, label: option.label }))} {...register("userId")} />
          </FormField>
          <FormField error={errors.tenantRole?.message} label="Tenant role" required>
            <SelectInput options={tenantRoleOptions} {...register("tenantRole")} />
          </FormField>
          <div className="sm:col-span-3">
            <SubmitRow busy={isSubmitting} feedback={feedback} label="Добавить доступ" onRefresh={() => router.refresh()} pendingLabel="Сохраняем…" />
          </div>
        </form>
      </SectionCard>
      <div className="grid gap-4 xl:grid-cols-2">
        {items.map((item) => <MembershipEditCard item={item} key={item.id} />)}
      </div>
    </div>
  );
}

export function ClientProvisioningAdmin({
  users,
  thresholdProfiles,
  clusterProfiles,
}: {
  users: IdentityAdminUserListItem[];
  thresholdProfiles: Array<{ id: string; label: string }>;
  clusterProfiles: Array<{ id: string; label: string }>;
}) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<Feedback>(null);
  const form = useForm<ProvisionClientInput>({
    resolver: zodResolver(provisionClientInputSchema) as Resolver<ProvisionClientInput>,
    defaultValues: {
      organizationName: "",
      organizationSlug: "",
      projectName: "",
      projectSlug: "",
      thresholdProfileId: thresholdProfiles[0]?.id ?? "",
      clusterProfileId: clusterProfiles[0]?.id ?? "",
      userName: "",
      username: "",
      password: "",
      tenantRole: "VIEWER",
    },
  });
  const submit = form.handleSubmit(async (values) => {
    const result = await provisionClientAction(values);
    if (!result.ok) {
      applyFieldErrors(result.fieldErrors, form.setError);
      setFeedback(feedbackFrom(result));
      return;
    }
    form.reset({ ...form.getValues(), organizationName: "", organizationSlug: "", projectName: "", projectSlug: "", userName: "", username: "", password: "" });
    setFeedback({ kind: "success", message: "Организация, проект и пользователь созданы" });
    router.refresh();
  });

  return (
    <div className="space-y-6">
      <SectionCard title="Создать клиента" description="Организация, проект, пользователь и доступ создаются одной атомарной операцией.">
        <form className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" onSubmit={submit}>
          <FormField error={form.formState.errors.organizationName?.message} label="Организация" required><TextInput {...form.register("organizationName")} /></FormField>
          <FormField error={form.formState.errors.organizationSlug?.message} label="Slug организации" required><TextInput {...form.register("organizationSlug")} /></FormField>
          <FormField error={form.formState.errors.projectName?.message} label="Проект" required><TextInput {...form.register("projectName")} /></FormField>
          <FormField error={form.formState.errors.projectSlug?.message} label="Slug проекта" required><TextInput {...form.register("projectSlug")} /></FormField>
          <FormField error={form.formState.errors.thresholdProfileId?.message} label="Пороговый профиль" required><SelectInput options={thresholdProfiles.map((item) => ({ value: item.id, label: item.label }))} {...form.register("thresholdProfileId")} /></FormField>
          <FormField error={form.formState.errors.clusterProfileId?.message} label="Кластерный профиль" required><SelectInput options={clusterProfiles.map((item) => ({ value: item.id, label: item.label }))} {...form.register("clusterProfileId")} /></FormField>
          <FormField error={form.formState.errors.userName?.message} label="Имя пользователя" required><TextInput {...form.register("userName")} /></FormField>
          <FormField error={form.formState.errors.username?.message} label="Логин" required><TextInput autoCapitalize="none" autoComplete="off" {...form.register("username")} /></FormField>
          <FormField error={form.formState.errors.password?.message} helper="Ровно 8 печатных символов без пробелов." label="Пароль" required><TextInput autoComplete="new-password" maxLength={8} minLength={8} type="password" {...form.register("password")} /></FormField>
          <FormField error={form.formState.errors.tenantRole?.message} label="Роль" required><SelectInput options={tenantRoleOptions} {...form.register("tenantRole")} /></FormField>
          <div className="sm:col-span-2 xl:col-span-3"><SubmitRow busy={form.formState.isSubmitting} feedback={feedback} label="Создать клиента" onRefresh={() => router.refresh()} pendingLabel="Создаём…" /></div>
        </form>
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-2">
        {users.map((user) => <UserAccessCard key={user.id} user={user} />)}
      </div>
    </div>
  );
}

function UserAccessCard({ user }: { user: IdentityAdminUserListItem }) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<Feedback>(null);
  const form = useForm<ResetUserPasswordInput>({
    resolver: zodResolver(resetUserPasswordInputSchema) as Resolver<ResetUserPasswordInput>,
    defaultValues: { userId: user.id, password: "" },
  });
  const resetPassword = form.handleSubmit(async (values) => {
    const result = await resetUserPasswordAction(values);
    if (!result.ok) {
      applyFieldErrors(result.fieldErrors, form.setError);
      setFeedback(feedbackFrom(result));
      return;
    }
    form.reset({ userId: user.id, password: "" });
    setFeedback({ kind: "success", message: "Пароль изменён, старые сессии отозваны" });
  });
  async function toggleEnabled() {
    const result = await setUserEnabledAction({ userId: user.id, enabled: user.disabled });
    setFeedback(result.ok ? { kind: "success", message: user.disabled ? "Пользователь включён" : "Пользователь отключён" } : feedbackFrom(result));
    if (result.ok) router.refresh();
  }
  return (
    <SectionCard title={user.name} description={`${user.username} · ${user.disabled ? "отключён" : "активен"}`}>
      <div className="space-y-4">
        <p className="text-sm text-slate-600">{user.memberships.length ? user.memberships.map((item) => `${item.organizationName}: ${item.tenantRole}`).join(" · ") : "Нет доступа к организациям"}</p>
        <form className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]" onSubmit={resetPassword}>
          <input type="hidden" {...form.register("userId")} />
          <FormField error={form.formState.errors.password?.message} label="Новый пароль"><TextInput autoComplete="new-password" maxLength={8} minLength={8} type="password" {...form.register("password")} /></FormField>
          <div className="self-end"><SubmitRow busy={form.formState.isSubmitting} feedback={feedback} label="Назначить пароль" pendingLabel="Сохраняем…" variant="outline" /></div>
        </form>
        <Button variant="link" type="button" onClick={toggleEnabled}>{user.disabled ? "Включить пользователя" : "Отключить пользователя"}</Button>
      </div>
    </SectionCard>
  );
}
