import { Link } from 'react-router-dom';
import { ArrowLeft, Boxes, Database, FileCode2, Layers3, Network, ServerCog, ShieldCheck } from 'lucide-react';

const modules = [
  { name: 'aquarium', desc: '鱼缸读写、鱼缸 schema、UI 包装入口', files: ['aquarium.module.ts', 'aquarium.schema.ts', 'aquarium.service.ts', 'aquarium.types.ts', 'aquarium.ui.tsx'] },
  { name: 'encyclopedia', desc: '图鉴搜索、分类筛选、图鉴服务入口', files: ['encyclopedia.module.ts', 'encyclopedia.schema.ts', 'encyclopedia.service.ts', 'encyclopedia.types.ts', 'encyclopedia.ui.tsx'] },
  { name: 'assistant', desc: 'AI 问答 schema、结构化输出、AI 服务调用入口', files: ['assistant.module.ts', 'assistant.schema.ts', 'assistant.service.ts', 'assistant.types.ts', 'assistant.ui.tsx'] },
  { name: 'species', desc: '物种列表、物种详情、分类基础服务', files: ['species.module.ts', 'species.schema.ts', 'species.service.ts', 'species.types.ts'] },
  { name: 'wishlist', desc: '种草清单读写、添加和移除', files: ['wishlist.module.ts', 'wishlist.schema.ts', 'wishlist.service.ts', 'wishlist.types.ts'] },
  { name: 'recommendation', desc: '混养推荐输入输出结构、推荐服务入口', files: ['recommendation.module.ts', 'recommendation.schema.ts', 'recommendation.service.ts', 'recommendation.types.ts'] },
];

const services = [
  { name: 'ai', desc: '统一 AI 调用，兼容现有 DeepSeek 接口' },
  { name: 'database', desc: '统一数据读写，当前适配 localStorage' },
  { name: 'storage', desc: '浏览器本地存储封装，读写前做 schema 校验' },
  { name: 'logger', desc: '统一日志入口，记录 info / warn / error' },
  { name: 'auth', desc: '用户鉴权入口，当前为本地用户，未来接微信 openid' },
  { name: 'sheets', desc: 'Google Sheets 写入占位，未来做数据同步' },
];

const currentPages = [
  ['Aquarium.tsx', '当前运行的“我的鱼缸”页面'],
  ['Encyclopedia.tsx', '当前运行的“图鉴”页面'],
  ['AIAssistant.tsx', '当前运行的“AI 养鱼助手”页面'],
  ['App.tsx', '路由、底部导航、页面壳'],
];

const dataAssets = [
  ['src/data/fishData.ts', '物种主知识库'],
  ['public/species-transparent', '透明底物种图，约 533 个文件'],
  ['public/species-display', '白底展示图，约 46 个文件'],
  ['functions/api/ai/chat.js', 'Cloudflare Pages AI 接口'],
  ['server/index.mjs', '本地开发 API 服务'],
];

function SectionTitle({ icon: Icon, title, desc }: { icon: typeof Layers3; title: string; desc: string }) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#1B4D3E] text-white shadow-sm">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h2 className="text-2xl font-black tracking-tight text-[#18231f]">{title}</h2>
        <p className="mt-1 text-sm font-semibold text-[#66746d]">{desc}</p>
      </div>
    </div>
  );
}

function CodeTree({ items }: { items: string[] }) {
  return (
    <ul className="mt-4 space-y-2 rounded-2xl border border-[#1f2a241f] bg-[#f8f6ef] p-4 font-mono text-xs text-[#26332d]">
      {items.map((item) => (
        <li key={item} className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[#1B4D3E]" />
          {item}
        </li>
      ))}
    </ul>
  );
}

export default function ProjectStructurePreview() {
  return (
    <div className="min-h-[100dvh] bg-[#dfe8e5] text-[#1f2a24]">
      <div className="mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-12">
        <header className="overflow-hidden rounded-[34px] border border-white/70 bg-[#fffdf8]/90 p-7 shadow-2xl shadow-[#1f2a2414] backdrop-blur md:p-10">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
            <Link
              to="/aquarium"
              className="inline-flex items-center gap-2 rounded-full border border-[#1f2a2420] bg-white px-4 py-2 text-sm font-black text-[#1B4D3E] shadow-sm transition hover:-translate-y-0.5"
            >
              <ArrowLeft className="h-4 w-4" />
              返回 App
            </Link>
            <span className="rounded-full bg-[#dfeee8] px-4 py-2 text-sm font-black text-[#1B4D3E]">内部结构预览 · 不展示给用户</span>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1.2fr_.8fr] lg:items-end">
            <div>
              <p className="mb-4 inline-flex rounded-full border border-[#1B4D3E22] bg-[#dfeee8] px-4 py-2 text-sm font-black text-[#1B4D3E]">AquaGuide Project Map</p>
              <h1 className="font-serif text-5xl font-black leading-[0.95] tracking-[-0.06em] md:text-7xl">
                现在项目有哪些结构？
              </h1>
              <p className="mt-5 max-w-3xl text-lg font-semibold leading-8 text-[#66746d]">
                当前项目处于“旧页面继续运行 + 新模块架构已建立”的阶段。也就是说，用户能看到的功能仍在原页面里，新建的 modules/services/shared 是后续安全扩展的工程骨架。
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                ['6', '功能模块'],
                ['6', '公共服务'],
                ['533', '透明底图片'],
                ['46', '展示白底图'],
              ].map(([num, label]) => (
                <div key={label} className="rounded-3xl border border-[#1f2a2414] bg-white p-5 shadow-sm">
                  <strong className="block font-serif text-4xl leading-none">{num}</strong>
                  <span className="mt-2 block text-sm font-black text-[#66746d]">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </header>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <article className="rounded-[30px] border border-[#1f2a2414] bg-[#fffdf8] p-6 shadow-xl shadow-[#1f2a240d]">
            <SectionTitle icon={FileCode2} title="当前运行页面" desc="这些仍然是 App 当前实际使用的页面文件。" />
            <div className="grid gap-3">
              {currentPages.map(([file, desc]) => (
                <div key={file} className="rounded-2xl border border-[#1f2a2414] bg-white p-4">
                  <div className="font-mono text-sm font-black text-[#1B4D3E]">{file}</div>
                  <div className="mt-1 text-sm font-semibold text-[#66746d]">{desc}</div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[30px] border border-[#1f2a2414] bg-[#fffdf8] p-6 shadow-xl shadow-[#1f2a240d]">
            <SectionTitle icon={ShieldCheck} title="第一阶段架构规则" desc="后续新增功能要遵守的边界。" />
            <div className="space-y-3 text-sm font-bold text-[#405049]">
              <p>每个功能必须独立成 module，并有明确 input schema / output schema。</p>
              <p>公共能力统一放在 services，例如 AI、数据库、鉴权、日志、Sheets。</p>
              <p>写入前必须经过 schema 校验，模块不能直接改另一个模块内部逻辑。</p>
            </div>
          </article>
        </section>

        <section className="mt-6 rounded-[30px] border border-[#1f2a2414] bg-[#fffdf8] p-6 shadow-xl shadow-[#1f2a240d]">
          <SectionTitle icon={Layers3} title="功能 Modules" desc="后续业务功能应该从这里对外暴露。" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {modules.map((module) => (
              <div key={module.name} className="rounded-3xl border border-[#1f2a2414] bg-white p-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-mono text-lg font-black text-[#1B4D3E]">{module.name}</h3>
                  <span className="rounded-full bg-[#dfeee8] px-3 py-1 text-xs font-black text-[#1B4D3E]">module</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-[#66746d]">{module.desc}</p>
                <CodeTree items={module.files} />
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
          <article className="rounded-[30px] border border-[#1f2a2414] bg-[#fffdf8] p-6 shadow-xl shadow-[#1f2a240d]">
            <SectionTitle icon={ServerCog} title="公共 Services" desc="所有模块共享的能力层。" />
            <div className="space-y-3">
              {services.map((service) => (
                <div key={service.name} className="rounded-2xl border border-[#1f2a2414] bg-white p-4">
                  <div className="font-mono text-sm font-black text-[#1B4D3E]">services/{service.name}</div>
                  <div className="mt-1 text-sm font-semibold text-[#66746d]">{service.desc}</div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[30px] border border-[#1f2a2414] bg-[#fffdf8] p-6 shadow-xl shadow-[#1f2a240d]">
            <SectionTitle icon={Database} title="数据、资源、接口" desc="物种知识库、图片资源和本地/线上接口。" />
            <div className="grid gap-3">
              {dataAssets.map(([path, desc]) => (
                <div key={path} className="rounded-2xl border border-[#1f2a2414] bg-white p-4">
                  <div className="font-mono text-sm font-black text-[#1B4D3E]">{path}</div>
                  <div className="mt-1 text-sm font-semibold text-[#66746d]">{desc}</div>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="mt-6 rounded-[30px] border border-[#1f2a2414] bg-[#fffdf8] p-6 shadow-xl shadow-[#1f2a240d]">
          <SectionTitle icon={Network} title="依赖关系" desc="理想状态下，功能只能按这个方向调用。" />
          <div className="grid gap-3 md:grid-cols-5">
            {['页面 UI', '功能 modules', '公共 services', '数据源', '部署/API'].map((item, index) => (
              <div key={item} className="relative rounded-3xl border border-[#1f2a2414] bg-white p-5 text-center">
                <div className="text-sm font-black text-[#66746d]">Step {index + 1}</div>
                <div className="mt-2 text-lg font-black text-[#18231f]">{item}</div>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm font-bold leading-7 text-[#6b4c12]">
            产品经理审查结论：现在最大的问题不是缺模块，而是旧页面还太胖。第二阶段建议先迁移 `species + encyclopedia`，把图鉴分类、搜索、物种详情从页面里抽到 module/service。
          </div>
        </section>
      </div>
    </div>
  );
}
