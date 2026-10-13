// "⋯" menu shared by the main screens: who is signed in + sign out.
import { MenuSheet, type MenuItem } from "@/components/MenuSheet";
import { signOut, useAuth } from "@/lib/auth";

type Props = {
  onClose: () => void;
  /** Screen-specific items shown above "Odjava" */
  items?: MenuItem[];
};

export function AccountMenu({ onClose, items = [] }: Props) {
  const { session } = useAuth();

  return (
    <MenuSheet
      title="Meni"
      subtitle={session?.user.email ? `Prijavljen kao ${session.user.email}` : undefined}
      onClose={onClose}
      items={[
        ...items,
        {
          label: "Odjava",
          danger: true,
          onPress: () => {
            onClose();
            // The root layout sends us to the login screen once the session is gone.
            signOut();
          },
        },
      ]}
    />
  );
}
