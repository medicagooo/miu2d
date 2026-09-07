import { borderRadius, modernColors, typography } from "./theme";

/** 两个现代面板共用的整理入口；实际排序通过 UI bridge 更新容器。 */
export function InventorySortButton({
  onClick,
  disabled,
  title,
}: {
  onClick?: () => void;
  disabled: boolean;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || !onClick}
      title={title}
      style={{
        alignSelf: "flex-end",
        flexShrink: 0,
        padding: "6px 8px",
        borderRadius: borderRadius.md,
        border: "1px solid #8B7355",
        background: modernColors.bg.hover,
        color: "#D4AF37",
        fontSize: typography.fontSize.sm,
        whiteSpace: "nowrap",
        cursor: disabled || !onClick ? "default" : "pointer",
        opacity: disabled || !onClick ? 0.45 : 1,
      }}
    >
      自动整理
    </button>
  );
}
