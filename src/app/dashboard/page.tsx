import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import LogoutButton from "./logout-button";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              南京大学未来编辑部
            </h1>
            <p className="text-sm text-gray-500">智慧课程平台</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user.email}</span>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">
            欢迎回来 👋
          </h2>
          <p className="text-gray-500 mt-1">
            选择你要进入的模块
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* 采编审稿 */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-md transition cursor-pointer">
            <div className="text-3xl mb-3">📝</div>
            <h3 className="text-lg font-semibold text-gray-900">采编审稿</h3>
            <p className="text-sm text-gray-500 mt-1">
              稿件撰写、编辑协作、审核发布
            </p>
            <span className="inline-block mt-3 text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
              开发中
            </span>
          </div>

          {/* 报道数据库 */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-md transition cursor-pointer">
            <div className="text-3xl mb-3">📊</div>
            <h3 className="text-lg font-semibold text-gray-900">报道数据库</h3>
            <p className="text-sm text-gray-500 mt-1">
              历史报道归档、全文检索、数据分析
            </p>
            <span className="inline-block mt-3 text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
              开发中
            </span>
          </div>

          {/* AI 助教 */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-md transition cursor-pointer">
            <div className="text-3xl mb-3">🤖</div>
            <h3 className="text-lg font-semibold text-gray-900">AI 助教</h3>
            <p className="text-sm text-gray-500 mt-1">
              智能问答、写作辅助、知识库检索
            </p>
            <span className="inline-block mt-3 text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
              开发中
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
