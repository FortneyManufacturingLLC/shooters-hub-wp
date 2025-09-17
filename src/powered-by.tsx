import React from 'react';

export const PoweredBy: React.FC<{ visible: boolean; url?: string }> = ({ visible, url }) => {
  if (!visible) return null;
  const content = (
    <span className="sh-powered">
      Powered by <strong>The Shooters Hub</strong>
    </span>
  );
  if (url) {
    return (
      <p className="sh-powered-wrapper">
        <a href={url} target="_blank" rel="noopener noreferrer">
          {content}
        </a>
      </p>
    );
  }
  return <p className="sh-powered-wrapper">{content}</p>;
};
