"use client";
import useSWR from "swr";
import { adminService } from "@/services/AdminService";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/contexts/LocaleContext";
import { adminCacheKey } from "@/cache/keys";
export default function Page(){ const {user}=useAuth(); const {activeLocale}=useLocale(); const key=user?adminCacheKey(user.id,user.role,"system","none",null,activeLocale):null; const {data,error}=useSWR(key,()=>adminService.rows<Record<string,unknown>>("system")); return <main className="na-content"><div className="na-heading"><div><p>Internal operations</p><h1>System</h1></div></div>{error?<div className="na-error">System health is unavailable.</div>:<section className="na-metrics">{Object.entries(data??{}).map(([name,value])=><article key={name}><span>{name.replaceAll("_"," ")}</span><strong>{value==null?"Not available yet":String(value)}</strong></article>)}</section>}</main>; }
