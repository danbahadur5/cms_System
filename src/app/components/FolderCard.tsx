import { Link } from 'react-router';
import { LucideIcon, Folder } from 'lucide-react';
import * as Icons from 'lucide-react';

interface FolderCardProps {
  title: string;
  description: string;
  icon?: string;
  color?: string;
  to: string;
  onClick?: () => void;
}

export function FolderCard({
  title,
  description,
  icon = 'Folder',
  color = '#FDB022',
  to,
  onClick,
}: FolderCardProps) {
  // Dynamically get the icon component
  const IconComponent = (Icons as any)[icon] as LucideIcon || Folder;

  return (
    <Link
      to={to}
      onClick={onClick}
      className="group block p-6 rounded-lg border-2 border-gray-200 hover:border-gray-300 bg-white hover:shadow-lg transition-all duration-200"
    >
      <div className="flex items-start gap-4">
        {/* Folder icon with custom color */}
        <div
          className="relative flex-shrink-0"
          style={{ color }}
        >
          <Folder className="h-16 w-16" fill="currentColor" />
          <div className="absolute inset-0 flex items-center justify-center pt-1">
            <IconComponent className="h-7 w-7 text-white" strokeWidth={2.5} />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg mb-1 group-hover:text-blue-600 transition-colors">
            {title}
          </h3>
          <p className="text-sm text-gray-600 line-clamp-2">{description}</p>
        </div>
      </div>
    </Link>
  );
}
