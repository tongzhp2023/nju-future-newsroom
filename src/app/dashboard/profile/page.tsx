import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getProfile, getDepartments, updateProfile } from "@/lib/actions";
import Link from "next/link";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getProfile();
  const departments = await getDepartments();
  const params = await searchParams;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link
            href="/dashboard"
            className="text-gray-400 hover:text-gray-600 transition"
          >
            ← 返回
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">个人资料</h1>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-6 py-8">
        {params.msg && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
            {params.msg}
          </div>
        )}

        <form action={updateProfile} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              姓名
            </label>
            <input
              name="full_name"
              type="text"
              defaultValue={profile?.full_name || ""}
              required
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="输入你的真实姓名"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              学号
            </label>
            <input
              name="student_id"
              type="text"
              defaultValue={profile?.student_id || ""}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="输入你的学号"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              所属编辑部
            </label>
            <select
              name="department_id"
              defaultValue={profile?.department_id || ""}
              required
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="">选择编辑部</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              角色
            </label>
            <input
              type="text"
              value={
                profile?.role === "admin"
                  ? "管理员"
                  : profile?.role === "editor"
                  ? "编辑"
                  : "记者"
              }
              disabled
              className="w-full border border-gray-100 rounded-lg px-4 py-2.5 text-sm bg-gray-50 text-gray-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              角色由管理员分配，如需变更请联系管理员
            </p>
          </div>

          <button
            type="submit"
            className="w-full bg-gray-900 text-white py-2.5 rounded-lg text-sm hover:bg-gray-800 transition"
          >
            保存资料
          </button>
        </form>
      </main>
    </div>
  );
}
