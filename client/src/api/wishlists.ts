import { api } from '@/lib/api';
import type {
  AddWishlistItemInput,
  BulkAddWishlistItemsInput,
  CreateWishlistInput,
  UpdateWishlistInput,
  WishlistDTO,
  WishlistItemDTO,
  WishlistWithItemsDTO,
} from '@codev/shared';

export async function listWishlistsApi(roomId?: string): Promise<WishlistDTO[]> {
  const res = await api.get<{ wishlists: WishlistDTO[] }>('/wishlists', {
    params: roomId ? { roomId } : undefined,
  });
  return res.data.wishlists;
}

export async function getWishlistDetailApi(
  wishlistId: string
): Promise<WishlistWithItemsDTO> {
  const res = await api.get<{ wishlist: WishlistWithItemsDTO }>(
    `/wishlists/${wishlistId}`
  );
  return res.data.wishlist;
}

export async function createWishlistApi(
  data: CreateWishlistInput
): Promise<WishlistDTO> {
  const res = await api.post<{ wishlist: WishlistDTO }>('/wishlists', data);
  return res.data.wishlist;
}

export async function updateWishlistApi(
  wishlistId: string,
  data: UpdateWishlistInput
): Promise<WishlistDTO> {
  const res = await api.patch<{ wishlist: WishlistDTO }>(
    `/wishlists/${wishlistId}`,
    data
  );
  return res.data.wishlist;
}

export async function deleteWishlistApi(wishlistId: string): Promise<void> {
  await api.delete(`/wishlists/${wishlistId}`);
}

export async function addWishlistItemApi(
  wishlistId: string,
  data: AddWishlistItemInput
): Promise<{ item: WishlistItemDTO; alreadyExists: boolean }> {
  const res = await api.post<{ item: WishlistItemDTO; alreadyExists: boolean }>(
    `/wishlists/${wishlistId}/items`,
    data
  );
  return res.data;
}

export async function addWishlistItemsBulkApi(
  wishlistId: string,
  data: BulkAddWishlistItemsInput
): Promise<{ addedCount: number }> {
  const res = await api.post<{ addedCount: number }>(
    `/wishlists/${wishlistId}/items/bulk`,
    data
  );
  return res.data;
}

export async function removeWishlistItemApi(
  wishlistId: string,
  itemId: string
): Promise<void> {
  await api.delete(`/wishlists/${wishlistId}/items/${itemId}`);
}

export async function removeWishlistItemByKeyApi(
  wishlistId: string,
  canonicalKey: string
): Promise<void> {
  await api.delete(`/wishlists/${wishlistId}/items`, {
    params: { canonicalKey },
  });
}
