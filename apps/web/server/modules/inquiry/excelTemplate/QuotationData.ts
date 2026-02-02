// QuotationData.ts
export type PhotoReference = {
  buffer: Buffer; // 图片二进制数据（如 PNG/JPG）
  mimeType: string; // 如 'image/png', 'image/jpeg'
  name: string; // 可选，用于调试或命名
};

// export type PhotoReference = {
//   buffer: Buffer;
//   mimeType: 'image/png' | 'image/jpeg' | 'image/gif';
//   name?: string;
// };
/**
 * 报价单数据结构 - 修正版（共 38 个字段）
 */
export interface QuotationData {
  // Exporter (出口商)
  exporterName: string;
  exporterAddr: string;
  exporterWeb: string;
  exporterEmail: string;
  exporterPhone: number;

  // Factory (工厂)
  factoryName: string;
  factoryAddr1: string;
  factoryAddr2: string;
  factoryAddr3: string;
  factoryWeb1: string;
  factoryWeb2: string;
  factoryWeb3: string;
  // factoryEmail: string;
  factoryPhone: number;

  // Client (客户)
  clientCompanyName: string;
  clientFullName: string;
  clientUserName: string; // 🔧 新增：从邮箱前缀提取的用户名
  clientWhatsApp: string;
  clientEmail: string;
  clientPhone: number;
  photoForRefer?: PhotoReference | null;

  // Terms (报价项) - 支持 3 行
  termsCode1: string | null;
  termsDesc1: string;
  termsUnits1: string;
  termsUsd1: string;
  termsRemark1: string;

  termsCode2: number | null;
  termsDesc2: string;
  termsUnits2: string;
  termsUsd2: number;
  termsRemark2: string;

  termsCode3: number | null;
  termsDesc3: string;
  termsUnits3: string;
  termsUsd3: number;
  termsRemark3: string;
  termsTTL: number;
  termsUSD: number;

  // Bank Info (银行信息)
  bankBeneficiary: string;
  bankAccountNo: number;
  bankName: string;
  bankAddr: string;

  // Signed By (签署代表)
  exporterBehalf: string;
  date: string;
  // 年月日每天的第几个订单
  // 00 00 00  00
  timeNo: string;
  clientAddr: string;
  payWay: string;
}
export const quotationDefaultData: QuotationData = {
  // === Exporter (出口商) ===
  exporterName: "DONG QI FOOTWEAR INTL MFG CO., LTD",
  exporterAddr:
    "No.2 Chiling Road, Chiling Industrial Zone, Houjie, Dongguan, Guangdong, China",
  exporterWeb: "www.dongqifootwear.com",
  exporterEmail: "sales@dongqifootwear.com",
  exporterPhone: 0, // Excel 中为空

  // === Factory (工厂) ===
  factoryName: "DONG QI FOOTWEAR (JIANGXI) CO., LTD",
  factoryAddr1:
    "Qifu Road #1, ShangOu Industrial Park, Yudu, Ganzhou, Jiangxi,China",
  factoryAddr2:
    "Industrial Road #3, Shangrao Industrial Zone, Shangrao, Jiangxi,China",
  factoryAddr3:
    "Qifu Road #2, ShangOu Industrial Park, Yudu, Ganzhou, Jiangxi,China",
  factoryWeb1: "www.dongqishoes.com", // 注意：和 exporter 相同
  factoryWeb2: "www.dongqifootwear.com",
  factoryWeb3: "www.dongqifootwear.com",
  // factoryEmail: "sales@dongqishoes.com",
  factoryPhone: 1_000_000_000,
  // factoryPhone 未出现，忽略

  // === Client (客户) ===
  clientCompanyName: "***A",
  clientFullName: "**",
  clientUserName: "", // 🔧 新增：从邮箱前缀提取的用户名
  clientWhatsApp: "111",
  clientEmail: "11111",
  clientPhone: 1233,
  photoForRefer: null, // 占位图，把商品图片放上去，

  // === Terms (报价项) - 全部为空 ===
  termsCode1: null,
  termsDesc1: "",
  termsUnits1: "",
  termsUsd1: "",
  termsRemark1: "",

  termsCode2: null,
  termsDesc2: "",
  termsUnits2: "",
  termsUsd2: 0,
  termsRemark2: "",

  termsCode3: null,
  termsDesc3: "",
  termsUnits3: "",
  termsUsd3: 0,
  termsRemark3: "",
  termsTTL: 0,
  termsUSD: 0,
  // === Bank Info ===
  bankBeneficiary: "dsadsaf",
  bankAccountNo: 0,
  bankName: "1111dsafds",
  bankAddr: "fdasfds",
  // === Signed By ===
  exporterBehalf: "Michael Tse", // 来自 SELLER -> ON BEHALF OF
  date: "2025-12-08",
  timeNo: "25_120_801",
  clientAddr: "guangzou",
  payWay: "Payment Method: Cash on Delivery",
} as const;
