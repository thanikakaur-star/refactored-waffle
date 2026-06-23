import type Stripe from "stripe";
interface PhysicalOrder {
    sessionId: string;
    name: string;
    address: Stripe.Address;
}
export declare function fulfillPhysical(order: PhysicalOrder): Promise<any>;
export {};
//# sourceMappingURL=physical.d.ts.map