// Each category's first entry is its default and matches the size Sense
// originally shipped with (Mobile 375×667, Tablet 768×1024, Laptop 1366×768,
// Desktop 1920×1080), so existing behavior is unchanged until a user picks
// a different device from the list.
//
// This is the fallback/reset source of truth — the options page persists a
// user-customized copy to chrome.storage.local, which takes over at runtime
// when present. This constant itself is never mutated.
export const DEFAULT_DEVICE_CATEGORIES = [
  {
    id: "mobile",
    name: "Mobile",
    devices: [
      { id: "mobile-iphone-se", name: "iPhone SE", width: 375, height: 667 },
      { id: "mobile-iphone-14", name: "iPhone 12/13/14", width: 390, height: 844 },
      { id: "mobile-iphone-14-pro-max", name: "iPhone 14 Pro Max", width: 430, height: 932 },
      { id: "mobile-pixel-7", name: "Pixel 7", width: 412, height: 915 },
      { id: "mobile-galaxy-s21", name: "Galaxy S21", width: 360, height: 800 },
    ],
  },
  {
    id: "tablet",
    name: "Tablet",
    devices: [
      { id: "tablet-ipad", name: "iPad", width: 768, height: 1024 },
      { id: "tablet-ipad-air", name: "iPad Air", width: 820, height: 1180 },
      { id: "tablet-ipad-pro-11", name: "iPad Pro 11\"", width: 834, height: 1194 },
      { id: "tablet-ipad-pro-12-9", name: "iPad Pro 12.9\"", width: 1024, height: 1366 },
      { id: "tablet-galaxy-tab-s8", name: "Galaxy Tab S8", width: 800, height: 1280 },
    ],
  },
  {
    id: "laptop",
    name: "Laptop",
    devices: [
      { id: "laptop-1366", name: "Laptop", width: 1366, height: 768 },
      { id: "laptop-1280", name: "Small laptop", width: 1280, height: 800 },
      { id: "laptop-1440-macbook-air", name: "MacBook Air", width: 1440, height: 900 },
      { id: "laptop-1536", name: "Laptop (HiDPI)", width: 1536, height: 864 },
    ],
  },
  {
    id: "desktop",
    name: "Desktop",
    devices: [
      { id: "desktop-1920", name: "Desktop", width: 1920, height: 1080 },
      { id: "desktop-1600", name: "Small desktop", width: 1600, height: 900 },
      { id: "desktop-2560-qhd", name: "Desktop QHD", width: 2560, height: 1440 },
    ],
  },
];
