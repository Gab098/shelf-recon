export const SHOP_QUERY = `#graphql
  query ShopInfo {
    shop {
      name
      myshopifyDomain
      currencyCode
      plan {
        displayName
      }
    }
  }
`;

export const PRODUCTS_LIST_QUERY = `#graphql
  query ProductsList($first: Int!, $after: String) {
    products(first: $first, after: $after, sortKey: UPDATED_AT, reverse: true) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          title
          handle
          productType
          tags
          totalInventory
          featuredImage {
            url
            altText
          }
          variants(first: 1) {
            edges {
              node {
                id
                price
                inventoryQuantity
              }
            }
          }
          description
        }
      }
    }
  }
`;

export const PRODUCTS_COUNT_QUERY = `#graphql
  query ProductsCount {
    productsCount
  }
`;

export const PRODUCT_CREATE_MUTATION = `#graphql
  mutation ProductCreate($input: ProductInput!) {
    productCreate(input: $input) {
      product {
        id
        handle
        title
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const PRODUCT_OPTIONS_CREATE_MUTATION = `#graphql
  mutation ProductOptionsCreate($productId: ID!, $options: [OptionCreateInput!]!) {
    productOptionsCreate(productId: $productId, options: $options) {
      product {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const PRODUCT_VARIANTS_BULK_CREATE_MUTATION = `#graphql
  mutation ProductVariantsBulkCreate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkCreate(productId: $productId, variants: $variants) {
      product {
        id
      }
      productVariants {
        id
        title
        price
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const PAGE_CREATE_MUTATION = `#graphql
  mutation PageCreate($input: PageInput!) {
    pageCreate(input: $input) {
      page {
        id
        handle
        title
      }
      userErrors {
        field
        message
      }
    }
  }
`;
