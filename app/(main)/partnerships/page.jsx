"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { fetchPartnershipsContent } from "@/lib/api";

export default function PartnershipsPage() {
    const [content, setContent] = useState(null);
    // Animation Variants
    const fadeInUp = {
        hidden: { opacity: 0, y: 30 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.8, ease: [0.21, 1.11, 0.81, 0.99] }
        }
    };

    const staggerContainer = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.05
            }
        }
    };

    useEffect(() => {
        fetchPartnershipsContent().then((data) => setContent(data)).catch(() => setContent({
            hero_title: 'Strategic Partnerships Ecosystem',
            hero_subtitle: 'Unified Structural Action',
            hero_description: 'Academic neglect is a multi-dimensional crisis. We bring together state departments, local schools, and community leaders into a single, coordinated framework to protect vulnerable children.',
            tiers: [
                { id: 'statutory', title: 'Government & Statutory Bodies', subtitle: 'Policy & Case Management Enforcement', description: 'Direct alignment with state departments ensures that community-level alerts transition into formal, state-backed social protection cases under the Children\'s Code Act of 2022.', entities: [{ name: 'MCDSS (Social Welfare Department)', role: 'Case management, vulnerable household grants, and statutory child protection interventions.' }, { name: 'Local Area Development Committees', role: 'Grassroots governance alignment and execution of localized community welfare programs.' }] },
                { id: 'educational', title: 'Educational Institutions', subtitle: 'Re-enrollment & Student Retention', description: 'Our local primary school partners are the front-line spaces where academic rehabilitation occurs. We work directly with school heads to streamline integration.', entities: [{ name: 'Matero Public Primary Schools', role: 'Direct classroom admission, administrative tracking, and student progression reporting.' }, { name: 'Community-Run Learning Spaces', role: 'Alternative education models and catch-up centers for older child laborers.' }] },
                { id: 'civic', title: 'Civil Society & Grassroots CBOs', subtitle: 'Logistical & Resource Mobilization', description: 'Partnering with local non-profits and community-based organizations helps pool field logistics, legal aid pathways, and parent outreach toolkits.', entities: [{ name: 'Zambian Child Rights Coalitions', role: 'Joint policy monitoring, training materials, and legal representation models.' }, { name: 'Matero Neighborhood Watch Groups', role: 'Direct street presence, tracking child vendors, and raising community awareness.' }] },
            ],
        }));
    }, []);

    const pageContent = content || {
        hero_title: 'Strategic Partnerships Ecosystem',
        hero_subtitle: 'Unified Structural Action',
        hero_description: 'Academic neglect is a multi-dimensional crisis. We bring together state departments, local schools, and community leaders into a single, coordinated framework to protect vulnerable children.',
        tiers: [
            { id: 'statutory', title: 'Government & Statutory Bodies', subtitle: 'Policy & Case Management Enforcement', description: 'Direct alignment with state departments ensures that community-level alerts transition into formal, state-backed social protection cases under the Children\'s Code Act of 2022.', entities: [{ name: 'MCDSS (Social Welfare Department)', role: 'Case management, vulnerable household grants, and statutory child protection interventions.' }, { name: 'Local Area Development Committees', role: 'Grassroots governance alignment and execution of localized community welfare programs.' }] },
            { id: 'educational', title: 'Educational Institutions', subtitle: 'Re-enrollment & Student Retention', description: 'Our local primary school partners are the front-line spaces where academic rehabilitation occurs. We work directly with school heads to streamline integration.', entities: [{ name: 'Matero Public Primary Schools', role: 'Direct classroom admission, administrative tracking, and student progression reporting.' }, { name: 'Community-Run Learning Spaces', role: 'Alternative education models and catch-up centers for older child laborers.' }] },
            { id: 'civic', title: 'Civil Society & Grassroots CBOs', subtitle: 'Logistical & Resource Mobilization', description: 'Partnering with local non-profits and community-based organizations helps pool field logistics, legal aid pathways, and parent outreach toolkits.', entities: [{ name: 'Zambian Child Rights Coalitions', role: 'Joint policy monitoring, training materials, and legal representation models.' }, { name: 'Matero Neighborhood Watch Groups', role: 'Direct street presence, tracking child vendors, and raising community awareness.' }] },
        ],
    };

    const partnerTiers = (pageContent.tiers || []).map((tier) => ({
        ...tier,
        icon: tier.id === "educational" ? (
            <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5zm0 0v6m-3-3h6" />
            </svg>
        ) : tier.id === "civic" ? (
            <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
        ) : (
            <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
        ),
    }));

    const [activeTab, setActiveTab] = useState("statutory");

    return (
        <div className="overflow-x-hidden bg-slate-50 text-slate-900 scroll-smooth">

            {/* 1. Dark Conceptual Hero Section */}
            <section className="bg-slate-950 text-white pt-32 pb-24 relative border-b border-slate-900">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(59,130,246,0.05),transparent)] pointer-events-none"></div>
                <div className="max-w-7xl mx-auto px-6 relative z-10">

                    <motion.div
                        className="max-w-3xl space-y-6"
                        initial="hidden"
                        animate="visible"
                        variants={staggerContainer}
                    >
                        <motion.span
                            variants={fadeInUp}
                            className="text-xs uppercase tracking-widest font-black text-amber-400 bg-amber-400/10 px-3 py-1.5 rounded-md"
                        >
                            {pageContent.hero_subtitle || 'Unified Structural Action'}
                        </motion.span>

                        <motion.h1
                            variants={fadeInUp}
                            className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.1] text-white"
                        >
                            {pageContent.hero_title || 'Strategic Partnerships Ecosystem'}
                        </motion.h1>

                        <motion.p
                            variants={fadeInUp}
                            className="text-base sm:text-xl text-slate-355 leading-relaxed font-light"
                        >
                            {pageContent.hero_description || 'Academic neglect is a multi-dimensional crisis. We bring together state departments, local schools, and community leaders into a single, coordinated framework to protect vulnerable children.'}
                        </motion.p>
                    </motion.div>

                </div>
            </section>

            {/* 2. Interactive Partnership Directory Section */}
            <section className="max-w-7xl mx-auto px-6 py-24">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">

                    {/* Navigation Controls Left Side */}
                    <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-8">
                        <span className="text-xs uppercase tracking-widest font-black text-blue-600">Our Network[cite: 1]</span>
                        <h2 className="text-3xl font-black tracking-tight text-slate-900">Coordinated Alliances[cite: 1]</h2>
                        <p className="text-slate-500 text-sm sm:text-base leading-relaxed font-light">
                            We leverage formal agreements with key institutions to transition raw community observations into swift, legally backed student safeguards[cite: 1].
                        </p>

                        {/* Quick-Nav Buttons */}
                        <div className="space-y-3 pt-6 border-t border-slate-200">
                            {partnerTiers.map((tier) => (
                                <button
                                    key={tier.id}
                                    onClick={() => setActiveTab(tier.id)}
                                    className={`w-full flex items-center justify-between p-4 rounded-xl border text-left transition-all duration-300 ${
                                        activeTab === tier.id
                                            ? "bg-white border-slate-300 shadow-md shadow-slate-100/50 text-slate-900 font-semibold"
                                            : "bg-transparent border-transparent text-slate-450 hover:text-slate-750"
                                    }`}
                                >
                                    <span className="text-sm">{tier.title}</span>
                                    <span className="p-1.5 rounded-lg bg-slate-100 text-slate-500">
                    {tier.icon}
                  </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Partner Detail Card - Right Side */}
                    <div className="lg:col-span-8 min-h-[480px] flex items-center justify-center">
                        <AnimatePresence mode="wait">
                            {partnerTiers.map((tier) => {
                                if (tier.id !== activeTab) return null;
                                return (
                                    <motion.div
                                        key={tier.id}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ duration: 0.4, ease: "easeOut" }}
                                        className="w-full bg-white border border-slate-200/80 rounded-2xl p-8 sm:p-12 shadow-sm flex flex-col justify-between space-y-8"
                                    >
                                        <div className="space-y-6">
                                            <div className="space-y-2">
                        <span className="text-[10px] uppercase tracking-widest font-bold text-blue-650 font-mono">
                          Tier Mapping
                        </span>
                                                <h3 className="text-2xl sm:text-3xl font-black text-slate-900">{tier.title}</h3>
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{tier.subtitle}</p>
                                            </div>

                                            <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-light">
                                                {tier.description}
                                            </p>
                                        </div>

                                        <div className="space-y-4 pt-6 border-t border-slate-100">
                                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Key Engagements:</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {tier.entities.map((ent, idx) => (
                                                    <div key={idx} className="bg-slate-50 p-5 rounded-xl border border-slate-200/40 space-y-2">
                                                        <h5 className="text-sm font-bold text-slate-800">{ent.name}</h5>
                                                        <p className="text-xs text-slate-500 leading-relaxed font-light">{ent.role}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>

                </div>
            </section>

            {/* 3. Operational Coordination Protocol */}
            <section className="bg-slate-900 text-white py-24 relative border-y border-slate-850">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(59,130,246,0.03),transparent)] pointer-events-none"></div>

                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <span className="text-xs uppercase tracking-widest font-black text-amber-400">Institutional Delivery</span>
                        <h2 className="text-3xl font-black tracking-tight sm:text-4xl mt-2 text-white">Our Referral Referral Flow[cite: 1]</h2>
                        <p className="text-slate-400 text-sm sm:text-base mt-4 leading-relaxed font-light">
                            How our community monitoring systems coordinate with statutory frameworks to establish immediate, long-term educational safety nets for school-aged kids[cite: 1].
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="bg-slate-950/40 p-8 rounded-2xl border border-slate-800/80 space-y-4">
                            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest block">Step 1</span>
                            <h4 className="text-lg font-bold text-slate-100">Audit & Flag</h4>
                            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-light">
                                Local volunteer committees identify a child working or vending during school hours and document the household&apos;s structural constraints[cite: 1].
                            </p>
                        </div>

                        <div className="bg-slate-950/40 p-8 rounded-2xl border border-slate-800/80 space-y-4">
                            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest block">Step 2</span>
                            <h4 className="text-lg font-bold text-slate-100">Mediation & Waiver</h4>
                            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-light">
                                We present the case to partner school administrations to secure fee waivers, organize immediate classroom spots, and distribute materials[cite: 1].
                            </p>
                        </div>

                        <div className="bg-slate-950/40 p-8 rounded-2xl border border-slate-800/80 space-y-4">
                            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest block">Step 3</span>
                            <h4 className="text-lg font-bold text-slate-100">Statutory Oversight</h4>
                            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-light">
                                For complex cases with systemic caregiver issues, the file is logged with the Department of Social Welfare to ensure legal child-protection backing[cite: 1].
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* 4. Strategic Governance Block */}
            <section className="max-w-5xl mx-auto px-6 py-24">
                <motion.div
                    className="bg-white border border-slate-200/80 rounded-3xl p-8 sm:p-12 text-center space-y-6 shadow-sm relative overflow-hidden"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    variants={fadeInUp}
                >
                    <div className="absolute -top-12 -left-12 w-40 h-40 bg-blue-500/5 rounded-full blur-2xl pointer-events-none"></div>
                    <h3 className="text-xs uppercase tracking-widest font-bold text-blue-600">
                        Alliance Governance Statement
                    </h3>
                    <p className="text-base sm:text-lg font-serif text-slate-750 italic max-w-3xl mx-auto leading-relaxed">
                        &ldquo;By formalizing partnerships with education authorities, local child-rights structures, and statutory social services, we turn isolation into coordinated accountability[cite: 1]. No child in Matero should fall between the gaps of uncoordinated institutions[cite: 1].&rdquo;
                    </p>
                    <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs font-semibold text-slate-450 uppercase tracking-wider">
                        <span>Coordinated Case Routing[cite: 1]</span>
                        <span>•</span>
                        <span>Inter-agency Safety Nets[cite: 1]</span>
                    </div>
                </motion.div>
            </section>

            {/* 5. Call to Action / Invitation */}
            <section className="max-w-5xl mx-auto px-6 pb-24 text-center">
                <motion.div
                    className="bg-gradient-to-br from-slate-950 to-slate-900 p-10 sm:p-16 rounded-3xl text-white shadow-2xl relative overflow-hidden border border-slate-800"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    variants={fadeInUp}
                >
                    <div className="absolute top-0 right-0 w-72 h-72 bg-blue-600/5 rounded-full blur-3xl pointer-events-none"></div>

                    <div className="relative z-10 max-w-2xl mx-auto space-y-6">
                        <h3 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
                            Coordinate Your Institution with Our Mission[cite: 1]
                        </h3>
                        <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
                            Are you a school administrator, local social welfare worker, or non-profit operating in Lusaka Province? Let’s combine resources to safeguard every child&apos;s right to education[cite: 1].
                        </p>
                        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link
                                href="/partnerships/apply"
                                className="w-full sm:w-auto px-6 py-3 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-md shadow-amber-500/10"
                            >
                                Become a Partner
                            </Link>
                            <Link
                                href="/solutions"
                                className="w-full sm:w-auto px-6 py-3 bg-slate-800 hover:bg-slate-750 active:scale-95 text-slate-200 font-medium rounded-xl text-sm border border-slate-700 transition-all"
                            >
                                View Core Solutions
                            </Link>
                        </div>
                    </div>
                </motion.div>
            </section>

        </div>
    );
}