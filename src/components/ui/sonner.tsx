import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast:
            "group toast !bg-[hsl(234_16%_19%)] !text-[hsl(229_35%_82%)] !border !border-[hsl(240_11%_22%)] !shadow-2xl !shadow-black/60 !rounded-lg",
          title: "!font-semibold !text-[hsl(229_35%_88%)]",
          description: "!text-[hsl(229_14%_55%)]",
          success:
            "!border-l-[3px] !border-l-[hsl(var(--syntax-green))] [&_[data-icon]]:!text-[hsl(var(--syntax-green))]",
          error:
            "!border-l-[3px] !border-l-[hsl(var(--destructive))] [&_[data-icon]]:!text-[hsl(var(--destructive))]",
          info:
            "!border-l-[3px] !border-l-[hsl(var(--primary))] [&_[data-icon]]:!text-[hsl(var(--primary))]",
          warning:
            "!border-l-[3px] !border-l-[hsl(var(--syntax-yellow))] [&_[data-icon]]:!text-[hsl(var(--syntax-yellow))]",
          actionButton: "!bg-[hsl(var(--primary))] !text-[hsl(var(--primary-foreground))]",
          cancelButton: "!bg-[hsl(var(--muted))] !text-[hsl(var(--muted-foreground))]",
          closeButton: "!bg-[hsl(234_16%_24%)] !border-[hsl(240_11%_22%)] !text-[hsl(229_14%_55%)] hover:!text-[hsl(229_35%_82%)]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
