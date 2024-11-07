import { Completer, Model, Prompt } from "../../complete";
import {
    SettingsUI as ProviderSettingsUI,
    Settings as ProviderSettings,
    parse_settings as parse_provider_settings,
} from "./provider_settings";
import {
    SettingsUI as ModelSettingsUI,
    parse_settings as parse_model_settings,
    Settings as ModelSettings,
} from "./model_settings";
import OpenAI from "openai";
import { Notice } from "obsidian";
import Mustache from "mustache";

export default class LMStudioModel implements Model {
    id: string;
    name: string;
    description: string;
    rate_limit_notice: Notice | null = null;
    rate_limit_notice_timeout: number | null = null;
    Settings = ModelSettingsUI;

    provider_settings: ProviderSettings;

    constructor(
        provider_settings: string,
        id: string,
        name: string,
        description: string
    ) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.provider_settings = parse_provider_settings(provider_settings);
    }

    get_api() {
        return new OpenAI({
            baseURL: this.provider_settings.endpoint + "/v1",
            apiKey: "lm-studio", // LM Studio doesn't require a real API key
            dangerouslyAllowBrowser: true,
        });
    }

    async prepare(
        prompt: Prompt,
        settings: ModelSettings
    ): Promise<{
        prefix: string;
        suffix: string;
        last_line: string;
        context: string;
    }> {
        const cropped = {
            prefix: prompt.prefix.slice(-(settings.prompt_length || 6000)),
            suffix: prompt.suffix.slice(0, settings.prompt_length || 6000),
        };
        const last_line = cropped.prefix
            .split("\n")
            .filter((x) => x.length > 0)
            .pop();
        return {
            ...cropped,
            last_line: last_line || "",
            context: cropped.prefix
                .split("\n")
                .filter((x) => x !== last_line)
                .join("\n"),
        };
    }

    async complete(prompt: Prompt, settings: string): Promise<string> {
        const model_settings = parse_model_settings(settings);

        try {
            const response = await this.get_api().chat.completions.create({
                model: this.id,
                messages: [
                    {
                        role: "system",
                        content: model_settings.system_prompt,
                    },
                    {
                        role: "user",
                        content: Mustache.render(
                            model_settings.user_prompt,
                            await this.prepare(prompt, model_settings)
                        ),
                    },
                ],
                temperature: model_settings.temperature,
                max_tokens: model_settings.max_tokens,
            });

            return this.interpret(
                prompt,
                response.choices[0]?.message?.content || ""
            );
        } catch (e) {
            throw new Error(`LM Studio API error: ${e.message}`);
        }
    }

    async *iterate(prompt: Prompt, settings: string): AsyncGenerator<string> {
        const model_settings = parse_model_settings(settings);

        try {
            const completion = await this.get_api().chat.completions.create({
                model: this.id,
                messages: [
                    {
                        role: "system",
                        content: model_settings.system_prompt,
                    },
                    {
                        role: "user",
                        content: Mustache.render(
                            model_settings.user_prompt,
                            await this.prepare(prompt, model_settings)
                        ),
                    },
                ],
                temperature: model_settings.temperature,
                max_tokens: model_settings.max_tokens,
                stream: true,
            });

            let initialized = false;
            for await (const chunk of completion) {
                const token = chunk.choices[0]?.delta?.content || "";
                if (!initialized) {
                    yield this.interpret(prompt, token);
                    initialized = true;
                } else {
                    yield token;
                }
            }
        } catch (e) {
            throw new Error(`LM Studio API error: ${e.message}`);
        }
    }

    interpret(prompt: Prompt, completion: string) {
        const response_punctuation = " \n.,?!:;";
        const prompt_punctuation = " \n";

        if (
            prompt.prefix.length !== 0 &&
            !prompt_punctuation.includes(
                prompt.prefix[prompt.prefix.length - 1]
            ) &&
            !response_punctuation.includes(completion[0])
        ) {
            completion = " " + completion;
        }

        return completion;
    }
}

export class LMStudioComplete implements Completer {
    id: string = "lmstudio";
    name: string = "LM Studio";
    description: string = "Local LM Studio server for running local models";

    async get_models(settings: string) {
        const provider_settings = parse_provider_settings(settings);
        const api = new OpenAI({
            baseURL: provider_settings.endpoint + "/v1",
            apiKey: "lm-studio",
            dangerouslyAllowBrowser: true,
        });

        try {
            const models = await api.models.list();
            return models.data.map((model: any) => {
                return new LMStudioModel(
                    settings,
                    model.id,
                    model.id,
                    `LM Studio model: ${model.id}`
                );
            });
        } catch (e) {
            throw new Error(`Failed to fetch LM Studio models: ${e.message}`);
        }
    }

    Settings = ProviderSettingsUI;
}
