"use client";

import { PlusOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { App, Button, Descriptions, Form, Input, Modal, Select, Space, Switch, Tag, Typography } from "antd";
import { useEffect, useState } from "react";
import { SortableTable } from "@/components/tables/SortableTable";
import { getRoleLabel, roleOptions } from "@/components/status/StatusTags";
import type { HotelSummary } from "@/types/domain";
import { formatDateTime, maskPhone } from "@/utils/format";

type ApiResult<T> = { success: true; data: T; message: string } | { success: false; error: { code: string; message: string } };
type AccountStatus = "active" | "disabled";
type AccountRecord = {
  id: string; username: string; name: string; phone?: string | null; roleCode: "admin" | "dispatcher" | "hotel_frontdesk" | "finance" | "butler";
  status: AccountStatus; hotelId?: string | null; hotel?: { id: string; name: string } | null; remark?: string | null;
  butler?: { id: string; name: string; phone: string; status: string } | null;
  miniProgramBound: boolean; miniProgramBoundAt?: string | null; lastMiniProgramLoginAt?: string | null; lastLoginAt?: string | null; createdAt: string;
};
type BackendAccountRoleCode = Exclude<AccountRecord["roleCode"], "butler">;
type AccountFormValues = { username?: string; password?: string; name: string; phone?: string; roleCode: BackendAccountRoleCode; hotelId?: string; status: AccountStatus; remark?: string };
type AccountQuery = { username?: string; name?: string; phone?: string; roleCode?: string; status?: string; hotelId?: string; miniProgramBound?: string };

const managedAccountRoleOptions = roleOptions;
const backendAccountRoleOptions = roleOptions.filter((item) => item.value !== "butler");
const emptyValues: AccountFormValues = { username: "", password: "", name: "", phone: "", roleCode: "dispatcher", status: "active", remark: "" };

function AccountEditor({ mode, account, hotels, onClose, onSubmit }: { mode: "create" | "edit"; account: AccountRecord | null; hotels: HotelSummary[]; onClose: () => void; onSubmit: (values: AccountFormValues) => Promise<void> }) {
  const initialValues: AccountFormValues = account ? { name: account.name, phone: account.phone ?? "", roleCode: account.roleCode as BackendAccountRoleCode, hotelId: account.hotelId ?? undefined, status: account.status, remark: account.remark ?? "" } : emptyValues;
  return <Modal open title={mode === "create" ? "新增后台账号" : "编辑后台账号"} destroyOnHidden footer={null} onCancel={onClose} width={560}>
    <Form key={`${mode}-${account?.id ?? "new"}`} layout="vertical" initialValues={initialValues} onFinish={onSubmit}>
      {mode === "create" ? <><Form.Item label="用户名" name="username" rules={[{ required: true, message: "请输入用户名" }]}><Input autoComplete="off" /></Form.Item><Form.Item label="初始密码" name="password" rules={[{ required: true, min: 8, message: "密码至少 8 位" }]}><Input.Password autoComplete="new-password" /></Form.Item></> : <Form.Item label="用户名"><Input value={account?.username} disabled /></Form.Item>}
      <Form.Item label="姓名" name="name" rules={[{ required: true, message: "请输入姓名" }]}><Input /></Form.Item>
      <Form.Item label="手机号" name="phone"><Input /></Form.Item>
      <Form.Item label="角色" name="roleCode" rules={[{ required: true, message: "请选择角色" }]}><Select options={backendAccountRoleOptions} /></Form.Item>
      <Form.Item noStyle shouldUpdate={(previous, current) => previous.roleCode !== current.roleCode}>{({ getFieldValue }) => getFieldValue("roleCode") === "hotel_frontdesk" ? <Form.Item label="所属酒店" name="hotelId" rules={[{ required: true, message: "酒店前台必须绑定酒店" }]}><Select showSearch optionFilterProp="label" options={hotels.map((hotel) => ({ label: hotel.name, value: hotel.id }))} /></Form.Item> : null}</Form.Item>
      <Form.Item label="账号状态" name="status" valuePropName="checked" getValueFromEvent={(checked: boolean) => checked ? "active" : "disabled"} getValueProps={(value: AccountStatus) => ({ checked: value === "active" })}><Switch checkedChildren="启用" unCheckedChildren="停用" /></Form.Item>
      <Form.Item label="备注" name="remark"><Input.TextArea rows={3} /></Form.Item>
      <Form.Item style={{ marginBottom: 0 }}><Space style={{ width: "100%", justifyContent: "flex-end" }}><Button onClick={onClose}>取消</Button><Button htmlType="submit" type="primary">保存</Button></Space></Form.Item>
    </Form>
  </Modal>;
}

export function AccountsClient() {
  const { message, modal } = App.useApp();
  const [items, setItems] = useState<AccountRecord[]>([]); const [hotels, setHotels] = useState<HotelSummary[]>([]); const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState<AccountQuery>({}); const [page, setPage] = useState(1); const [pageSize, setPageSize] = useState(20); const [total, setTotal] = useState(0);
  const [editing, setEditing] = useState<AccountRecord | null | "create">(null); const [detail, setDetail] = useState<AccountRecord | null>(null);
  async function request<T>(url: string, init?: RequestInit) { const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } }); const result = await res.json() as ApiResult<T>; if (!res.ok || !result.success) throw new Error(result.success ? "请求失败" : result.error.message); return result.data; }
  async function load(nextPage = page, nextPageSize = pageSize, nextQuery = query) { setLoading(true); try { const params = new URLSearchParams({ page: String(nextPage), pageSize: String(nextPageSize) }); Object.entries(nextQuery).forEach(([key, value]) => { if (value) params.set(key, value); }); const data = await request<{ items: AccountRecord[]; total: number }>(`/api/accounts?${params}`); setItems(data.items); setTotal(data.total); setPage(nextPage); setPageSize(nextPageSize); } catch (error) { message.error(error instanceof Error ? error.message : "加载账号失败"); } finally { setLoading(false); } }
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void Promise.all([
        load(1, 20, {}),
        request<{ items: HotelSummary[] }>("/api/hotels").then((data) => setHotels(data.items))
      ]).catch(() => undefined);
    }, 0);
    return () => window.clearTimeout(timer);
    // 初始化请求仅执行一次，后续数据刷新由页面操作触发。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  async function save(values: AccountFormValues) { try { if (editing === "create") await request("/api/accounts", { method: "POST", body: JSON.stringify(values) }); else if (editing) await request(`/api/accounts/${editing.id}`, { method: "PUT", body: JSON.stringify(values) }); message.success(editing === "create" ? "后台账号已创建" : "后台账号已更新"); setEditing(null); load(1); } catch (error) { message.error(error instanceof Error ? error.message : "保存失败"); } }
  function confirmAction(account: AccountRecord, action: "enable" | "disable" | "unbind-miniprogram", title: string) { modal.confirm({ title, content: `确认对账号“${account.username}”执行此操作？`, okText: "确认", cancelText: "取消", onOk: async () => { try { await request(`/api/accounts/${account.id}/${action}`, { method: "POST" }); message.success("操作成功"); load(); if (detail?.id === account.id) setDetail(null); } catch (error) { message.error(error instanceof Error ? error.message : "操作失败"); throw error; } } }); }
  function resetPassword(account: AccountRecord) { let password = ""; modal.confirm({ title: "重置密码", content: <Input.Password placeholder="请输入至少 8 位的新密码" onChange={(event) => { password = event.target.value; }} />, okText: "确认重置", cancelText: "取消", onOk: async () => { if (password.length < 8) { message.error("新密码至少 8 位"); throw new Error("invalid password"); } try { await request(`/api/accounts/${account.id}/reset-password`, { method: "POST", body: JSON.stringify({ newPassword: password }) }); message.success("密码已重置"); } catch (error) { message.error(error instanceof Error ? error.message : "重置失败"); throw error; } } }); }
  function renderActions(record: AccountRecord) { const isButler = record.roleCode === "butler"; return <Space size={0}><Button type="link" onClick={() => setDetail(record)}>详情</Button>{isButler ? null : <Button type="link" onClick={() => setEditing(record)}>编辑</Button>}<Button type="link" onClick={() => resetPassword(record)}>重置密码</Button>{isButler ? null : <Button type="link" onClick={() => confirmAction(record, record.status === "active" ? "disable" : "enable", record.status === "active" ? "停用账号" : "启用账号")}>{record.status === "active" ? "停用" : "启用"}</Button>}{!isButler && record.miniProgramBound ? <Button type="link" danger onClick={() => confirmAction(record, "unbind-miniprogram", "解绑小程序")}>解绑微信</Button> : null}</Space>; }
  return <section className="page-panel"><Space orientation="vertical" size={16} style={{ width: "100%" }}><Space style={{ justifyContent: "space-between", width: "100%" }}><Typography.Title level={3} style={{ margin: 0 }}>后台账号管理</Typography.Title><Space><Button icon={<ReloadOutlined />} onClick={() => load()}>刷新</Button><Button type="primary" icon={<PlusOutlined />} onClick={() => setEditing("create")}>新增账号</Button></Space></Space>
    <Form layout="inline" onFinish={(values: AccountQuery) => { setQuery(values); load(1, pageSize, values); }}><Form.Item name="username"><Input placeholder="用户名" /></Form.Item><Form.Item name="name"><Input placeholder="姓名" /></Form.Item><Form.Item name="phone"><Input placeholder="手机号" /></Form.Item><Form.Item name="roleCode"><Select allowClear placeholder="角色" style={{ width: 130 }} options={managedAccountRoleOptions} /></Form.Item><Form.Item name="status"><Select allowClear placeholder="状态" style={{ width: 110 }} options={[{ label: "启用", value: "active" }, { label: "停用", value: "disabled" }]} /></Form.Item><Form.Item name="hotelId"><Select allowClear placeholder="所属酒店" style={{ width: 180 }} options={hotels.map((hotel) => ({ label: hotel.name, value: hotel.id }))} /></Form.Item><Form.Item name="miniProgramBound"><Select allowClear placeholder="小程序绑定" style={{ width: 135 }} options={[{ label: "已绑定", value: "true" }, { label: "未绑定", value: "false" }]} /></Form.Item><Button htmlType="submit" type="primary" icon={<SearchOutlined />}>查询</Button><Button onClick={() => { setQuery({}); load(1, pageSize, {}); }}>重置</Button></Form>
    <SortableTable<AccountRecord> rowKey="id" loading={loading} dataSource={items} scroll={{ x: 1500 }} pagination={{ current: page, pageSize, total, showSizeChanger: true, onChange: (nextPage, nextSize) => load(nextPage, nextSize) }} columns={[{ title: "用户名", dataIndex: "username", width: 130 }, { title: "姓名", dataIndex: "name", width: 110 }, { title: "手机号", dataIndex: "phone", width: 140, render: maskPhone }, { title: "角色", dataIndex: "roleCode", width: 110, render: getRoleLabel }, { title: "关联对象", width: 160, render: (_, record) => record.roleCode === "butler" ? record.butler?.name ?? "-" : record.hotel?.name ?? "-" }, { title: "账号状态", dataIndex: "status", width: 100, render: (value) => <Tag color={value === "active" ? "success" : "default"}>{value === "active" ? "启用" : "停用"}</Tag> }, { title: "小程序", dataIndex: "miniProgramBound", width: 110, render: (value) => <Tag color={value ? "success" : "default"}>{value ? "已绑定" : "未绑定"}</Tag> }, { title: "绑定时间", dataIndex: "miniProgramBoundAt", width: 165, render: formatDateTime }, { title: "最近小程序登录", dataIndex: "lastMiniProgramLoginAt", width: 165, render: formatDateTime }, { title: "最后后台登录", dataIndex: "lastLoginAt", width: 165, render: formatDateTime }, { title: "创建时间", dataIndex: "createdAt", width: 165, render: formatDateTime }, { title: "操作", fixed: "right", width: 260, render: (_, record) => renderActions(record) }]} />
  </Space>{editing ? <AccountEditor mode={editing === "create" ? "create" : "edit"} account={editing === "create" ? null : editing} hotels={hotels} onClose={() => setEditing(null)} onSubmit={save} /> : null}{detail ? <Modal open title="账号详情" footer={<Button onClick={() => setDetail(null)}>关闭</Button>} onCancel={() => setDetail(null)}><Descriptions bordered column={1} size="small"><Descriptions.Item label="用户名">{detail.username}</Descriptions.Item><Descriptions.Item label="姓名">{detail.name}</Descriptions.Item><Descriptions.Item label="角色">{getRoleLabel(detail.roleCode)}</Descriptions.Item><Descriptions.Item label="所属酒店">{detail.hotel?.name ?? "-"}</Descriptions.Item><Descriptions.Item label="关联管家">{detail.butler?.name ?? "-"}</Descriptions.Item><Descriptions.Item label="小程序绑定">{detail.miniProgramBound ? "已绑定" : "未绑定"}</Descriptions.Item><Descriptions.Item label="绑定时间">{formatDateTime(detail.miniProgramBoundAt)}</Descriptions.Item><Descriptions.Item label="最近小程序登录">{formatDateTime(detail.lastMiniProgramLoginAt)}</Descriptions.Item><Descriptions.Item label="最后后台登录">{formatDateTime(detail.lastLoginAt)}</Descriptions.Item><Descriptions.Item label="备注">{detail.remark ?? "-"}</Descriptions.Item></Descriptions></Modal> : null}</section>;
}
