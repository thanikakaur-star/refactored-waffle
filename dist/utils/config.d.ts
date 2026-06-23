export declare const config: {
    port: number;
    nodeEnv: string;
    readonly stripe: {
        secretKey: string;
        webhookSecret: string;
    };
    readonly resend: {
        apiKey: string;
        from: string;
    };
    readonly lulu: {
        apiKey: string;
        apiSecret: string;
        sandbox: boolean;
    };
    readonly anthropic: {
        apiKey: string;
    };
    readonly convertkit: {
        apiKey: string;
        formId: string;
    };
    download: {
        baseUrl: string;
        expiryHours: number;
    };
};
//# sourceMappingURL=config.d.ts.map