"use client";

import React, { useState, useCallback } from "react";
import { ChevronRight, Folder, File, FolderOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Download } from "lucide-react";
import { ArkCheckbox } from "./checkbox-1";

export type TreeNode = {
  id: string;
  label: string;
  icon?: React.ReactNode;
  children?: TreeNode[];
  data?: any;
};

export type TreeViewProps = {
  data: TreeNode[];
  className?: string;
  onNodeClick?: (node: TreeNode) => void;
  onNodeExpand?: (nodeId: string, expanded: boolean) => void;
  defaultExpandedIds?: string[];
  showLines?: boolean;
  showIcons?: boolean;
  selectable?: boolean;
  multiSelect?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  indent?: number;
  animateExpand?: boolean;
  selectedAssets?: Set<number>;
  onAssetDownload?: (assetId: number) => void;
  downloadingAssetId?: number | null;
};

export function TreeView({
  data,
  className,
  onNodeClick,
  onNodeExpand,
  defaultExpandedIds = [],
  showLines = false,
  showIcons = true,
  selectable = true,
  multiSelect = false,
  selectedIds = [],
  onSelectionChange,
  indent = 20,
  animateExpand = true,
  selectedAssets,
  onAssetDownload,
  downloadingAssetId,
}: TreeViewProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    new Set(defaultExpandedIds),
  );
  const [internalSelectedIds, setInternalSelectedIds] =
    useState<string[]>(selectedIds);

  const isControlled =
    selectedIds !== undefined && onSelectionChange !== undefined;
  const currentSelectedIds = isControlled ? selectedIds : internalSelectedIds;

  const toggleExpanded = useCallback(
    (nodeId: string) => {
      setExpandedIds((prev) => {
        const newSet = new Set(prev);
        const isExpanded = newSet.has(nodeId);
        isExpanded ? newSet.delete(nodeId) : newSet.add(nodeId);
        onNodeExpand?.(nodeId, !isExpanded);
        return newSet;
      });
    },
    [onNodeExpand],
  );

  const handleSelection = useCallback(
    (nodeId: string, ctrlKey = false) => {
      if (!selectable) return;

      let newSelection: string[];

      if (multiSelect && ctrlKey) {
        newSelection = currentSelectedIds.includes(nodeId)
          ? currentSelectedIds.filter((id) => id !== nodeId)
          : [...currentSelectedIds, nodeId];
      } else {
        newSelection = currentSelectedIds.includes(nodeId) ? [] : [nodeId];
      }

      isControlled
        ? onSelectionChange?.(newSelection)
        : setInternalSelectedIds(newSelection);
    },
    [
      selectable,
      multiSelect,
      currentSelectedIds,
      isControlled,
      onSelectionChange,
    ],
  );

  const renderNode = (
    node: TreeNode,
    level = 0,
    isLast = false,
    parentPath: boolean[] = [],
  ) => {
    const hasChildren = (node.children?.length ?? 0) > 0;
    const isExpanded = expandedIds.has(node.id);
    const isSelected = currentSelectedIds.includes(node.id);
    const currentPath = [...parentPath, isLast];
    const isAssetNode = node.id.startsWith('asset-');
    const assetId = isAssetNode ? parseInt(node.id.replace('asset-', '')) : null;
    const isAssetSelected = isAssetNode && assetId !== null && selectedAssets?.has(assetId);

    const getDefaultIcon = () =>
      hasChildren ? (
        isExpanded ? (
          <FolderOpen className="h-4 w-4" />
        ) : (
          <Folder className="h-4 w-4" />
        )
      ) : (
        <File className="h-4 w-4" />
      );

    return (
      <div key={node.id} className="select-none">
        <motion.div
          className={cn(
            "flex items-center py-2 px-3 cursor-pointer transition-all duration-200 relative group rounded-md mx-1",
            hasChildren ? "hover:bg-[var(--color-canvas-subtle)]" : (isAssetSelected ? "bg-[rgba(108,63,245,0.08)]" : "hover:bg-[var(--color-canvas-subtle)]"),
          )}
          style={{ paddingLeft: level * indent + 8 }}
          onClick={(e) => {
            const target = e.target as HTMLElement;
            // If clicking expand area, only toggle expand
            if (target.closest('.expand-area')) {
              return;
            }
            // If clicking checkbox wrapper, let checkbox handle it
            if (target.closest('.checkbox-wrapper')) {
              return;
            }
            // For asset rows, toggle selection
            if (isAssetNode && assetId !== null) {
              const newSelected = new Set(selectedAssets || []);
              if (newSelected.has(assetId)) {
                newSelected.delete(assetId);
              } else {
                newSelected.add(assetId);
              }
              onSelectionChange?.(Array.from(newSelected).map(id => `asset-${id}`));
              return;
            }
            // For folder nodes, toggle expand and selection
            if (hasChildren) {
              toggleExpanded(node.id);
              handleSelection(node.id, e.ctrlKey || e.metaKey);
            }
          }}
          whileTap={{ scale: 0.98, transition: { duration: 0.1 } }}
        >
          {/* Expand Icon */}
          <motion.div
            className="expand-area flex items-center justify-center w-6 h-6 mr-1 cursor-pointer"
            animate={{ rotate: hasChildren && isExpanded ? 90 : 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            {hasChildren ? (
              <ChevronRight className="h-3 w-3 text-[var(--color-fg-muted)]" />
            ) : isAssetNode ? (
              <div className="checkbox-wrapper">
                <ArkCheckbox
                  checked={isAssetSelected || false}
                  onChange={(checked) => {
                    const newSelected = new Set(selectedAssets || []);
                    if (assetId !== null) {
                      if (checked) {
                        newSelected.add(assetId);
                      } else {
                        newSelected.delete(assetId);
                      }
                      onSelectionChange?.(Array.from(newSelected).map(id => `asset-${id}`));
                    }
                  }}
                />
              </div>
            ) : null}
          </motion.div>

          {/* File Icon for asset nodes */}
          {isAssetNode && node.icon && (
            <span className="mr-2 shrink-0">{node.icon}</span>
          )}

          {/* Node Icon */}
          {showIcons && !isAssetNode && (
            <motion.div
              className="flex items-center justify-center w-4 h-4 mr-2 text-[var(--color-fg-muted)]"
              whileHover={{ scale: 1.1 }}
              transition={{ duration: 0.15 }}
            >
              {node.icon || getDefaultIcon()}
            </motion.div>
          )}

          {/* Label */}
          <span className={cn(
            "text-sm truncate flex-1",
            hasChildren ? "font-medium" : "font-normal"
          )}>
            {node.label}
          </span>

          {/* File info and download button for asset nodes */}
          {isAssetNode && node.data && (
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-[var(--color-fg-muted)]">
                {node.data.size ? formatBytes(node.data.size) : ''}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (assetId !== null) onAssetDownload?.(assetId);
                }}
                disabled={downloadingAssetId === assetId}
                className="p-1.5 rounded-md transition-all"
                style={{ background: downloadingAssetId === assetId ? '#A78BFA' : '#6C3FF5' }}
                onMouseEnter={(e) => { if (downloadingAssetId !== assetId) e.currentTarget.style.background = '#5B35E0'; }}
                onMouseLeave={(e) => { if (downloadingAssetId !== assetId) e.currentTarget.style.background = '#6C3FF5'; }}
              >
                <Download className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
          )}
        </motion.div>

        {/* Children */}
        <AnimatePresence>
          {hasChildren && isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{
                duration: animateExpand ? 0.3 : 0,
                ease: "easeInOut",
              }}
              className="overflow-hidden"
            >
              <motion.div
                initial={{ y: -10 }}
                animate={{ y: 0 }}
                exit={{ y: -10 }}
                transition={{
                  duration: animateExpand ? 0.2 : 0,
                  delay: animateExpand ? 0.1 : 0,
                }}
              >
                {node.children!.map((child, index) =>
                  renderNode(
                    child,
                    level + 1,
                    index === node.children!.length - 1,
                    currentPath,
                  ),
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <motion.div
      className={cn("w-full", className)}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <div className="p-2">
        {data.map((node, index) =>
          renderNode(node, 0, index === data.length - 1),
        )}
      </div>
    </motion.div>
  );
}

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
