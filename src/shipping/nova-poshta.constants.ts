export const NP_API_URL = 'https://api.novaposhta.ua/v2.0/json/';

export const NP_WAREHOUSE_TYPES = {
  POST_MACHINE: '95dc212d-479c-4ffb-a8ab-8c1b9073d0bc',
  BRANCH: 'a9f93df5-5012-11ec-8ee1-005056b24375',
} as const;

export const NP_CACHE_TTL = {
  CITIES: 60 * 60 * 1000,
  WAREHOUSES: 30 * 60 * 1000,
} as const;
