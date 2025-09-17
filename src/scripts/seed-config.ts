export interface SeedConfig {
  users: {
    buyers: number;
    sellers: number;
    partners: number;
    admins: number;
  };
  shops: number;
  products: number;
  purchases: number;
  reviews: number;
  referrals: number;
}

export const defaultConfig: SeedConfig = {
  users: {
    buyers: 50,
    sellers: 20,
    partners: 10,
    admins: 2,
  },
  shops: 25,
  products: 100,
  purchases: 200,
  reviews: 150,
  referrals: 30,
};

export const devConfig: SeedConfig = {
  users: {
    buyers: 10,
    sellers: 5,
    partners: 3,
    admins: 1,
  },
  shops: 8,
  products: 20,
  purchases: 30,
  reviews: 25,
  referrals: 10,
};

export const testConfig: SeedConfig = {
  users: {
    buyers: 5,
    sellers: 2,
    partners: 1,
    admins: 1,
  },
  shops: 3,
  products: 10,
  purchases: 15,
  reviews: 10,
  referrals: 5,
};
