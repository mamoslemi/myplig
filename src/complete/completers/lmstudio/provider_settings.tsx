import * as React from "react";
import SettingsItem from "../../../components/SettingsItem";
import { z } from "zod";

export const settings_schema = z.object({
    endpoint: z.string(),
});

export type Settings = z.infer<typeof settings_schema>;

const default_settings: Settings = {
    endpoint: "http://localhost:3245",
};

export const parse_settings = (data: string | null): Settings => {
    if (data === null) {
        return default_settings;
    }
    try {
        const settings: unknown = JSON.parse(data);
        return settings_schema.parse(settings);
    } catch (e) {
        return default_settings;
    }
};

export function SettingsUI({
    settings,
    saveSettings,
}: {
    settings: string | null;
    saveSettings: (settings: string) => void;
}) {
    return (
        <SettingsItem
            name="API endpoint"
            description="The endpoint where your LM Studio server is running"
        >
            <input
                type="text"
                value={parse_settings(settings).endpoint}
                onChange={(e) =>
                    saveSettings(JSON.stringify({ endpoint: e.target.value }))
                }
            />
        </SettingsItem>
    );
}
