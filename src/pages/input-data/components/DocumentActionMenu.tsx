import type { Ref } from 'react';
import { createPortal } from 'react-dom';
import type { DocumentItem, DocumentActionConfig } from '../inputData.types';
import {
  documentMenuStyle,
  documentMenuSeparatorStyle,
  documentMenuItemStyle,
  documentMenuDangerItemStyle,
} from '../../UploadPage.styles';

type DocumentActionMenuProps = {
  document: DocumentItem;
  actions: DocumentActionConfig[];
  position: { top: number; right: number };
  menuRef: Ref<HTMLDivElement>;
  onAction: (document: DocumentItem, action: DocumentActionConfig) => void;
};

export function DocumentActionMenu({
  document,
  actions,
  position,
  menuRef,
  onAction,
}: DocumentActionMenuProps) {
  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      aria-label={`More actions for ${document.fileName}`}
      style={{
        ...documentMenuStyle,
        position: 'fixed',
        top: position.top,
        right: position.right,
        zIndex: 1000,
      }}
    >
      {actions.map((action) => (
        <div key={action.kind}>
          {action.separatorBefore ? <div role="separator" style={documentMenuSeparatorStyle} /> : null}
          <button
            type="button"
            role="menuitem"
            onClick={() => onAction(document, action)}
            disabled={action.disabled}
            title={action.title ?? action.label}
            style={
              action.danger
                ? documentMenuDangerItemStyle(Boolean(action.disabled))
                : documentMenuItemStyle(Boolean(action.disabled))
            }
          >
            {action.label}
          </button>
        </div>
      ))}
    </div>,
    globalThis.document.body,
  );
}
