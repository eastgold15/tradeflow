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
 * 报价单数据结构 - 修正版（共 42 个字段）
 * 🔥 新增字段：factoryAddr, fatoryWeb, factoryEmail
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
  factoryAddr2?: string; // 设为可选
  factoryAddr3?: string; // 设为可选
  factoryWeb1?: string;  // 设为可选
  factoryWeb2?: string;  // 设为可选
  factoryWeb3?: string;  // 设为可选
  factoryPhone: number;

  // 🔥 新增字段（兼容新模板）
  factoryAddr?: string;    // FTY ADDR - 工厂地址（合并或单行显示）
  fatoryWeb?: string;       // web - 工厂网站（注意模板拼写错误：fatoryWeb）
  factoryEmail?: string;    // email - 工厂邮箱

  // Client (客户)
  clientCompanyName: string;
  clientFullName: string;
  clientUserName: string; // 🔧 新增：从邮箱前缀提取的用户名
  clientWhatsApp: string;
  clientEmail: string;
  clientPhone: number;
  photoForRefer?: PhotoReference | null;

  // Terms (报价项) - 支持 3 行
  termsCode1: string;
  termsDesc1: string;
  termsUnits1: string;
  termsUsd1: string;
  termsRemark1: string;
  termsTTL: number;
  termsUSD: number;
  termsCode2?: string;   // 设为可选
  termsDesc2?: string;   // 设为可选
  termsUnits2?: string;  // 设为可选
  termsUsd2?: string;    // 设为可选
  termsRemark2?: string; // 设为可选
  termsCode3?: string;   // 设为可选
  termsDesc3?: string;   // 设为可选
  termsUnits3?: string;  // 设为可选
  termsUsd3?: string;    // 设为可选
  termsRemark3?: string; // 设为可选

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
  termsCode1: "",
  termsDesc1: "",
  termsUnits1: "",
  termsUsd1: "",
  termsRemark1: "",

  termsCode2: undefined,
  termsDesc2: "",
  termsUnits2: "",
  termsUsd2: undefined,
  termsRemark2: "",

  termsCode3: undefined,
  termsDesc3: "",
  termsUnits3: "",
  termsUsd3: undefined,
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
