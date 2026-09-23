"use client";

import { HoursEditor } from "./hours-editor";
import { KitchenSectionsEditor } from "./kitchen-sections-editor";
import { OperationsForm } from "./operations-form";
import { ProfileForm } from "./profile-form";
import { Tabs, type TabItem } from "@/components/ui/tabs";
import type { RestaurantSettingsView } from "@/lib/services/restaurant-settings";
import { DOMAIN_ICONS } from "@/lib/ui/icons";
import type { OptionGroup } from "@/lib/ui/locale-options";

/**
 * Settings (S1-P07-T005): four areas of one restaurant — who it is, when it is open, how it runs, and where its
 * tickets go. Branding and the public website are their own page (`/restaurant/website`), because a restaurant edits
 * them for a different reason and at a different time.
 *
 * Each tab is its own form and saves on its own: a time-zone change should not depend on the address being valid.
 * `canEdit` comes from the caller's permissions and decides whether a tab is a form or a read-only list; the server
 * re-checks every save regardless (SC-RBAC-08).
 */
export function SettingsTabs({
  view,
  timeZones,
  currencies,
  countries,
}: {
  view: RestaurantSettingsView;
  timeZones: OptionGroup[];
  currencies: OptionGroup[];
  countries: OptionGroup[];
}) {
  const items: TabItem[] = [
    {
      id: "profile",
      label: "Profile",
      icon: DOMAIN_ICONS.restaurant,
      content: <ProfileForm restaurant={view.restaurant} canEdit={view.canEdit.profile} />,
    },
    {
      id: "hours",
      label: "Opening hours",
      icon: DOMAIN_ICONS.clock,
      content: <HoursEditor hours={view.hours} canEdit={view.canEdit.profile} timezone={view.restaurant.timezone} />,
    },
    {
      id: "operations",
      label: "Operations",
      icon: DOMAIN_ICONS.settings,
      content: (
        <OperationsForm
          restaurant={view.restaurant}
          currencyLocked={view.currencyLocked}
          canEdit={view.canEdit.settings}
          timeZones={timeZones}
          currencies={currencies}
          countries={countries}
        />
      ),
    },
    {
      id: "sections",
      label: "Kitchen sections",
      icon: DOMAIN_ICONS.kitchen,
      content: <KitchenSectionsEditor sections={view.kitchenSections} canEdit={view.canEdit.sections} />,
    },
  ];

  return <Tabs items={items} label="Settings sections" />;
}
