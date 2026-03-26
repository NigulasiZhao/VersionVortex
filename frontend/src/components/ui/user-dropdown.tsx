"use client"

import { useState } from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { FormDialog, FormField } from "@/components/ui/form-dialog"
import { Lock, LogOut } from "lucide-react"
import { adminChangePassword } from "@/services/api"

interface UserDropdownProps {
  username: string
  onLogout: () => void
}

export function UserDropdown({ username, onLogout }: UserDropdownProps) {
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const initials = username.slice(0, 2).toUpperCase()

  const handleChangePassword = async (values: Record<string, string>) => {
    if (values.newPassword !== values.confirmPassword) {
      throw new Error("两次输入的密码不一致")
    }
    if (values.newPassword.length < 6) {
      throw new Error("新密码长度不能少于6位")
    }
    await adminChangePassword(username, values.oldPassword, values.newPassword)
  }

  const changePasswordFields: FormField[] = [
    {
      id: "oldPassword",
      label: "当前密码",
      type: "password",
      placeholder: "请输入当前密码",
      required: true,
    },
    {
      id: "newPassword",
      label: "新密码",
      type: "password",
      placeholder: "请输入新密码（至少6位）",
      required: true,
    },
    {
      id: "confirmPassword",
      label: "确认密码",
      type: "password",
      placeholder: "请再次输入新密码",
      required: true,
    },
  ]

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all hover:bg-black/5">
            <Avatar className="size-8 border border-white/20 shadow-sm">
              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-indigo-500 text-white text-xs font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-[var(--color-fg-default)] hidden sm:inline">
              {username}
            </span>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          className="no-scrollbar w-48 rounded-xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg p-1 shadow-lg border border-gray-200/50 dark:border-gray-700/50"
          align="end"
          sideOffset={8}
        >
          <DropdownMenuItem
            className="cursor-pointer rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-purple-900/20"
            onClick={() => setChangePasswordOpen(true)}
          >
            <Lock className="mr-2.5 size-4 text-gray-400" />
            修改密码
          </DropdownMenuItem>

          <DropdownMenuSeparator className="bg-gray-100/80 dark:bg-gray-800/80" />

          <DropdownMenuItem
            className="cursor-pointer rounded-lg px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
            onClick={onLogout}
          >
            <LogOut className="mr-2.5 size-4" />
            退出登录
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <FormDialog
        open={changePasswordOpen}
        onOpenChange={setChangePasswordOpen}
        title="修改密码"
        description="请填写以下信息来修改您的密码"
        fields={changePasswordFields}
        onSubmit={handleChangePassword}
        submitText="确认修改"
        loading={loading}
      />
    </>
  )
}

export default UserDropdown
