interface DigitalOrder {
    email: string;
    sessionId: string;
}
interface DownloadToken {
    sessionId: string;
    expires: number;
}
export declare function generateDownloadToken(sessionId: string): string;
export declare function verifyDownloadToken(token: string): DownloadToken | null;
export declare function fulfillDigital(order: DigitalOrder): Promise<void>;
export {};
//# sourceMappingURL=digital.d.ts.map