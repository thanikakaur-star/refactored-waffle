import { Router, type Request, type Response } from "express";

export const productsRouter = Router();

const CATALOG = [
  {
    id: "digital",
    name: "Digital Colouring Book",
    tagline: "Instant PDF Download",
    description: "40+ pages of beautiful Sikh & Panjabi cultural colouring pages. Gurmukhi script, Gurdwara architecture, festivals, the Five Ks, and more. Print at home as many times as you like.",
    price: 899,
    currency: "gbp",
    features: [
      "40+ hand-designed colouring pages",
      "Educational text on every page",
      "Gurmukhi vocabulary with transliteration",
      "Instant PDF download",
      "Print unlimited copies at home",
    ],
    popular: false,
  },
  {
    id: "physical",
    name: "Printed Colouring Book",
    tagline: "Shipped to Your Door",
    description: "Beautiful 8.5×11\" softcover printed book on quality uncoated paper, perfect for colouring with pencils, crayons, or markers. Shipped worldwide via Lulu Express.",
    price: 1499,
    currency: "gbp",
    features: [
      "8.5×11\" softcover, perfect bound",
      "Printed on 60# uncoated paper",
      "Rich educational content throughout",
      "Ships worldwide",
      "Perfect gift for families",
    ],
    popular: true,
  },
  {
    id: "bundle",
    name: "Digital + Physical Bundle",
    tagline: "Best Value",
    description: "Get the instant PDF download today and a beautiful printed copy shipped to your door. Save £3 compared to buying separately.",
    price: 1999,
    currency: "gbp",
    features: [
      "Everything in Digital + Physical",
      "Start colouring immediately with PDF",
      "Printed copy ships separately",
      "Save £3 vs buying individually",
      "Best value for families",
    ],
    popular: false,
  },
];

productsRouter.get("/", (_req: Request, res: Response) => {
  const products = CATALOG.map((p) => ({
    ...p,
    priceFormatted: `£${(p.price / 100).toFixed(2)}`,
  }));
  res.json({ products });
});

productsRouter.get("/:id", (req: Request, res: Response) => {
  const product = CATALOG.find((p) => p.id === req.params.id);
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json({
    ...product,
    priceFormatted: `£${(product.price / 100).toFixed(2)}`,
  });
});
