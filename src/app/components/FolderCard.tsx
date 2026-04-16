import { Link } from 'react-router';
import { LucideIcon, Folder, ArrowRight } from 'lucide-react';
import * as Icons from 'lucide-react';
import { resolveMediaUrl } from '../utils/api';
import { cn } from './ui/utils';

interface FolderCardProps {
  title: string;
  description: string;
  icon?: string;
  color?: string;
  image?: string;
  to: string;
  onClick?: () => void;
  className?: string;
  progress?: number;
}

export function FolderCard({
  title,
  description,
  icon = 'Folder',
  color = '#3b82f6',
  image,
  to,
  onClick,
  className,
  progress = 0,
}: FolderCardProps) {
  const IconComponent = (Icons as any)[icon] as LucideIcon || Folder;

  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        "group relative flex items-center gap-5 overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 transition-all duration-500 ease-out hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_20px_40px_-15px_rgba(59,130,246,0.12)]",
        className
      )}
    >
      {/* Icon / Image Container */}
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-gray-50/80 p-0.5 transition-all duration-500 group-hover:scale-105 group-hover:bg-blue-50/50">
        {image ? (
          <img
            src={resolveMediaUrl(image)}
            alt={title}
            className="h-full w-full rounded-[14px] object-cover shadow-sm"
          />
        ) : (
          <div 
            className="flex h-full w-full items-center justify-center"
            style={{ color }}
          >
            <div className="relative">
              <Folder className="h-12 w-12 opacity-[0.15]" fill="currentColor" />
              <div className="absolute inset-0 flex items-center justify-center pt-0.5">
                <IconComponent className="h-6 w-6 transition-transform duration-500 group-hover:scale-110" strokeWidth={2} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 py-1">
        <h3 className="mb-1.5 text-lg font-bold tracking-tight text-gray-900 transition-colors group-hover:text-blue-600 line-clamp-1">
          {title}
        </h3>
        <p className="text-[15px] leading-relaxed text-gray-500 line-clamp-2 font-medium opacity-80 group-hover:opacity-100 transition-opacity">
          {description}
        </p>
      </div>

      {/* Interaction Indicator */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-blue-100/0 bg-blue-50/0 text-blue-500 opacity-0 transition-all duration-500 -translate-x-4 group-hover:translate-x-0 group-hover:border-blue-100 group-hover:bg-blue-50 group-hover:opacity-100 group-hover:shadow-sm">
        <ArrowRight className="h-5 w-5" />
      </div>

      {/* Hover Progress Bar */}
      <div className="absolute bottom-0 left-0 h-[3px] w-full bg-gray-50/50">
        <div 
          className="h-full bg-blue-400/20 transition-all duration-700 ease-in-out"
          style={{ width: `${progress}%` }}
        />
        <div 
          className="absolute inset-0 h-full w-0 bg-gradient-to-r from-blue-400 to-blue-300 transition-all duration-1000 ease-in-out group-hover:w-full"
        />
        <div className="absolute bottom-0 left-0 h-full w-0 bg-blue-300 blur-sm transition-all duration-1000 ease-in-out group-hover:w-full opacity-0 group-hover:opacity-50" />
      </div>
    </Link>
  );
}
