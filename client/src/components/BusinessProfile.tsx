import React from 'react';
import { X, Mail, Linkedin, Twitter, Facebook, Globe, Phone, MapPin, Building2 } from 'lucide-react';

interface BusinessProfileProps {
    business: any;
    onClose: () => void;
}

export function BusinessProfile({ business, onClose }: BusinessProfileProps) {
    const enrichment = business.enrichment[0] || {};
    const emails = enrichment.emails || [];
    const socials = enrichment.socialProfiles || [];

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-2xl border border-slate-800 shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex items-start justify-between bg-slate-950">
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-2">{business.name}</h2>
                        <div className="flex items-center gap-4 text-slate-400 text-sm">
                            <div className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                {business.address}
                            </div>
                            {business.rating && (
                                <div className="flex items-center gap-1 text-amber-400">
                                    <span className="font-bold">{business.rating}</span> Rating
                                </div>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <X className="w-6 h-6 text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left Column: Contact & Basic Info */}
                    <div className="space-y-6">
                        <Section title="Contact Information">
                            <div className="space-y-3">
                                {business.phone && (
                                    <ContactItem icon={<Phone className="w-4 h-4" />} label="Phone" value={business.phone} />
                                )}
                                {business.website && (
                                    <ContactItem
                                        icon={<Globe className="w-4 h-4" />}
                                        label="Website"
                                        value={business.website}
                                        link={business.website}
                                    />
                                )}
                                {emails.map((email: string, i: number) => (
                                    <ContactItem key={i} icon={<Mail className="w-4 h-4" />} label="Email" value={email} isEmail />
                                ))}
                            </div>
                        </Section>

                        <Section title="Social Presence">
                            <div className="flex flex-wrap gap-2">
                                {socials.length > 0 ? socials.map((url: string, i: number) => (
                                    <SocialBadge key={i} url={url} />
                                )) : (
                                    <span className="text-slate-500 text-sm">No social profiles found.</span>
                                )}
                            </div>
                        </Section>
                    </div>

                    {/* Right Column: Intelligence & News */}
                    <div className="space-y-6">
                        <Section title="Recent News & Mentions">
                            <div className="space-y-4">
                                {enrichment.newsMentions?.length > 0 ? (
                                    enrichment.newsMentions.map((news: any, i: number) => (
                                        <div key={i} className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                                            <h4 className="font-medium text-blue-400 mb-1 line-clamp-2">
                                                <a href={news.url} target="_blank" rel="noreferrer" className="hover:underline">
                                                    {news.title}
                                                </a>
                                            </h4>
                                            <p className="text-xs text-slate-500">{news.publishedDate || 'Recent'}</p>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-slate-500 text-sm italic">No recent news found.</div>
                                )}
                            </div>
                        </Section>

                        <Section title="Website Content Analysis">
                            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-sm text-slate-400 max-h-48 overflow-y-auto">
                                {enrichment.websiteContent ? (
                                    <div className="prose prose-invert prose-sm max-w-none">
                                        {enrichment.websiteContent.slice(0, 500)}...
                                    </div>
                                ) : (
                                    <span className="italic">Content not available or not scraped yet.</span>
                                )}
                            </div>
                        </Section>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Section({ title, children }: { title: string, children: React.ReactNode }) {
    return (
        <div>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">{title}</h3>
            {children}
        </div>
    );
}

function ContactItem({ icon, label, value, link, isEmail }: any) {
    return (
        <div className="flex items-center gap-3 p-3 bg-slate-950 rounded-lg border border-slate-800">
            <div className="text-slate-400">{icon}</div>
            <div className="flex-1 min-w-0">
                <div className="text-xs text-slate-500">{label}</div>
                {link || isEmail ? (
                    <a
                        href={isEmail ? `mailto:${value}` : link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-400 hover:underline truncate block font-medium"
                    >
                        {value}
                    </a>
                ) : (
                    <div className="text-slate-200 truncate font-medium">{value}</div>
                )}
            </div>
        </div>
    );
}

function SocialBadge({ url }: { url: string }) {
    let icon = <Globe className="w-3 h-3" />;
    let label = 'Web';

    if (url.includes('linkedin')) { icon = <Linkedin className="w-3 h-3" />; label = 'LinkedIn'; }
    else if (url.includes('twitter') || url.includes('x.com')) { icon = <Twitter className="w-3 h-3" />; label = 'Twitter'; }
    else if (url.includes('facebook')) { icon = <Facebook className="w-3 h-3" />; label = 'Facebook'; }

    return (
        <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full text-xs transition-colors border border-slate-700"
        >
            {icon}
            {label}
        </a>
    );
}
