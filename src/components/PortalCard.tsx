import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ExternalLink, Settings, Check, HelpCircle } from 'lucide-react';

interface PortalCardProps {
  id: string;
  title: string;
  description: string;
  defaultUrl: string;
  localStorageKey: string;
  icon: React.ReactNode;
  accentColor: string;
  features: string[];
}

export const PortalCard: React.FC<PortalCardProps> = ({
  id,
  title,
  description,
  defaultUrl,
  localStorageKey,
  icon,
  accentColor,
  features
}) => {
  const [url, setUrl] = useState(defaultUrl);
  const [isEditing, setIsEditing] = useState(false);
  const [tempUrl, setTempUrl] = useState(defaultUrl);

  React.useEffect(() => {
    setUrl(defaultUrl);
    setTempUrl(defaultUrl);
    // Sync to localStorage to clear any old stale values
    localStorage.setItem(localStorageKey, defaultUrl);
  }, [defaultUrl, localStorageKey]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    let formattedUrl = tempUrl.trim();
    if (formattedUrl && !/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = 'https://' + formattedUrl;
    }
    localStorage.setItem(localStorageKey, formattedUrl);
    setUrl(formattedUrl);
    setTempUrl(formattedUrl);
    setIsEditing(false);
  };

  const handleReset = () => {
    localStorage.removeItem(localStorageKey);
    setUrl(defaultUrl);
    setTempUrl(defaultUrl);
    setIsEditing(false);
  };

  const hoverBorderColor = 
    id === 'quiz' ? 'hover:border-indigo-500' :
    id === 'downloads' ? 'hover:border-blue-500' :
    'hover:border-emerald-500';

  const buttonBgColor =
    id === 'quiz' ? 'bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-100' :
    id === 'downloads' ? 'bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-100' :
    'bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-100';

  return (
    <motion.div
      id={`portal-card-${id}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.4 }}
      className={`bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md ${hoverBorderColor} transition-all duration-300 overflow-hidden flex flex-col h-full`}
    >
      {/* Decorative colored top bar */}
      <div className={`h-2 ${accentColor}`} />

      <div className="p-6 flex flex-col flex-grow">
        {/* Card Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl bg-slate-50 text-slate-700 border border-slate-200 flex items-center justify-center`}>
              {icon}
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg tracking-tight">{title}</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">UET Official Gateway</p>
            </div>
          </div>

          {/* Configure button removed as requested */}
        </div>

        {/* Description */}
        <p className="text-slate-500 text-sm mb-6 leading-relaxed flex-grow font-normal">
          {description}
        </p>

        {/* Feature list */}
        <div className="mb-6 space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Features & Resources</span>
          {features.map((feature, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              <span>{feature}</span>
            </div>
          ))}
        </div>

        {/* Action / Edit Section */}
        {isEditing ? (
          <form onSubmit={handleSave} className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200 animate-fadeIn">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Configure Target URL</label>
              <input
                type="text"
                value={tempUrl}
                onChange={(e) => setTempUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={handleReset}
                className="px-2.5 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded-md transition-colors"
              >
                Reset Default
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 text-xs bg-slate-800 text-white font-medium rounded-md hover:bg-slate-700 transition-colors flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" /> Save
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-auto pt-4 border-t border-slate-100">
            <a
              id={`btn-redirect-${id}`}
              href={url}
              target="_blank"
              referrerPolicy="no-referrer"
              className={`w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 text-white active:scale-[0.98] transition-all ${buttonBgColor}`}
            >
              <span>Access Website</span>
              <ExternalLink className="w-4 h-4" />
            </a>
            <div className="text-center mt-2">
              <span className="text-[10px] text-slate-400 font-mono select-all truncate block px-2">
                Destination: {url}
              </span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};
