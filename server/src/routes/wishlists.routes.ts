import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  addWishlistItemSchema,
  bulkAddWishlistItemsSchema,
  createWishlistSchema,
  updateWishlistSchema,
  type AddWishlistItemInput,
  type BulkAddWishlistItemsInput,
  type CreateWishlistInput,
  type UpdateWishlistInput,
} from '@codev/shared';
import { auth } from '../hooks/authenticate.js';
import { rateLimit } from '../services/rate_limiter.js';
import * as wishlistsService from '../services/wishlists.service.js';
import { validateBody, validateParams } from '../utils/validate.js';

const wishlistIdParamsSchema = z.object({
  id: z.string().uuid('Invalid wishlist ID format'),
});

const wishlistItemParamsSchema = z.object({
  id: z.string().uuid('Invalid wishlist ID format'),
  itemId: z.string().uuid('Invalid item ID format'),
});

type WishlistIdParams = z.infer<typeof wishlistIdParamsSchema>;
type WishlistItemParams = z.infer<typeof wishlistItemParamsSchema>;

export default async function wishlistRoutes(app: FastifyInstance) {
  app.addHook('preHandler', auth);

  // GET /wishlists?roomId=... - List personal + room-shared wishlists
  app.get('/', async (req, reply) => {
    const query = (req.query || {}) as { roomId?: string };
    const wishlists = await wishlistsService.listWishlists(req.user.id, query.roomId);
    return reply.status(200).send({ wishlists });
  });

  // POST /wishlists - Create a new wishlist folder
  app.post(
    '/',
    { preHandler: [validateBody(createWishlistSchema)] },
    async (req, reply) => {
      const input = req.body as CreateWishlistInput;
      const wishlist = await wishlistsService.createWishlist(req.user.id, input);
      return reply.status(201).send({ wishlist });
    }
  );

  // GET /wishlists/:id - Fetch folder metadata and hydrated problems
  app.get(
    '/:id',
    { preHandler: [validateParams(wishlistIdParamsSchema)] },
    async (req, reply) => {
      const { id } = req.params as WishlistIdParams;
      const wishlist = await wishlistsService.getWishlistDetail(id, req.user.id);
      return reply.status(200).send({ wishlist });
    }
  );

  // PATCH /wishlists/:id - Update folder name, description, or visibility
  app.patch(
    '/:id',
    {
      preHandler: [
        validateParams(wishlistIdParamsSchema),
        validateBody(updateWishlistSchema),
      ],
    },
    async (req, reply) => {
      const { id } = req.params as WishlistIdParams;
      const input = req.body as UpdateWishlistInput;
      const wishlist = await wishlistsService.updateWishlist(id, req.user.id, input);
      return reply.status(200).send({ wishlist });
    }
  );

  // DELETE /wishlists/:id - Delete a wishlist folder
  app.delete(
    '/:id',
    { preHandler: [validateParams(wishlistIdParamsSchema)] },
    async (req, reply) => {
      const { id } = req.params as WishlistIdParams;
      await wishlistsService.deleteWishlist(id, req.user.id);
      return reply.status(200).send({ ok: true });
    }
  );

  // POST /wishlists/:id/items - Add a problem (by URL/ID or pre-scraped payload) to folder
  app.post(
    '/:id/items',
    {
      preHandler: [
        rateLimit({
          max: 40,
          windowSec: 60,
          keyPrefix: 'wishlist-add-item',
          keyGenerator: (req) => req.user?.id || req.ip,
        }),
        validateParams(wishlistIdParamsSchema),
        validateBody(addWishlistItemSchema),
      ],
    },
    async (req, reply) => {
      const { id } = req.params as WishlistIdParams;
      const input = req.body as AddWishlistItemInput;
      const result = await wishlistsService.addItemToWishlist(id, req.user.id, input);
      return reply.status(result.alreadyExists ? 200 : 201).send(result);
    }
  );

  // POST /wishlists/:id/items/bulk - Batch add items atomically (e.g. cloning curated lists)
  app.post(
    '/:id/items/bulk',
    {
      preHandler: [
        rateLimit({
          max: 20,
          windowSec: 60,
          keyPrefix: 'wishlist-bulk-add',
          keyGenerator: (req) => req.user?.id || req.ip,
        }),
        validateParams(wishlistIdParamsSchema),
        validateBody(bulkAddWishlistItemsSchema),
      ],
    },
    async (req, reply) => {
      const { id } = req.params as WishlistIdParams;
      const input = req.body as BulkAddWishlistItemsInput;
      const result = await wishlistsService.addItemsToWishlistBulk(
        id,
        req.user.id,
        input.items
      );
      return reply.status(201).send(result);
    }
  );

  // DELETE /wishlists/:id/items?canonicalKey=... - Remove a problem by canonicalKey
  app.delete(
    '/:id/items',
    { preHandler: [validateParams(wishlistIdParamsSchema)] },
    async (req, reply) => {
      const { id } = req.params as WishlistIdParams;
      const query = (req.query || {}) as { canonicalKey?: string };
      const result = await wishlistsService.removeItemFromWishlist(id, req.user.id, {
        canonicalKey: query.canonicalKey,
      });
      return reply.status(200).send(result);
    }
  );

  // DELETE /wishlists/:id/items/:itemId - Remove an item by row ID
  app.delete(
    '/:id/items/:itemId',
    { preHandler: [validateParams(wishlistItemParamsSchema)] },
    async (req, reply) => {
      const { id, itemId } = req.params as WishlistItemParams;
      const result = await wishlistsService.removeItemFromWishlist(id, req.user.id, {
        itemId,
      });
      return reply.status(200).send(result);
    }
  );
}
