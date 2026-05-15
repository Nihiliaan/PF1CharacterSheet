import React from 'react';

interface MarkdownPreviewProps {
  text: string;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

/**
 * A lightweight component to render simple inline markdown (hyperlinks) 
 * for preview text like names, races, and classes.
 */
export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ text, className, onClick }) => {
  if (!text) return null;
  
  // Regex for [label](url)
  const regex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts: (string | React.ReactNode)[] = [];
  let lastIndex = 0;
  let match;

  const safeText = String(text);

  while ((match = regex.exec(safeText)) !== null) {
    if (match.index > lastIndex) {
      parts.push(safeText.substring(lastIndex, match.index));
    }
    const label = match[1];
    const url = match[2];
    
    parts.push(
      <span 
        key={match.index} 
        className="text-primary hover:underline cursor-pointer font-bold"
        onClick={(e) => {
          e.stopPropagation();
          window.open(url, '_blank');
        }}
      >
        {label}
      </span>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < safeText.length) {
    parts.push(safeText.substring(lastIndex));
  }

  return (
    <span className={className} onClick={onClick}>
      {parts.length > 0 ? parts : safeText}
    </span>
  );
};

export default MarkdownPreview;
