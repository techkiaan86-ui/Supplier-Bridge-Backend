import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import axios from 'axios';
import { encryptSecret } from '../utils/crypto';

/**
 * Handles POST /api/v1/store/shift4shop/callback (App Store Subscription Events)
 */
export const handleShift4ShopCallback = async (req: Request, res: Response) => {
  try {
    const { Action, StoreUrl, Token } = req.body;
    console.log(`[Shift4Shop OAuth Callback] Action: ${Action}, Store: ${StoreUrl}`);

    if (Action === 'AUTHORIZE' || Action === 'REAUTHORIZE') {
      const redirectUri = process.env.SHIFT4SHOP_REDIRECT_URL || 'https://your-middleware-domain.com/api/v1/store/shift4shop/redirect';
      // Build the PostBackURL for Shift4Shop to load in popup/iframe
      const postBackUrl = `${redirectUri}?store_url=${encodeURIComponent(StoreUrl)}&token=${encodeURIComponent(Token || '')}`;
      return res.json({ PostBackURL: postBackUrl });
    }

    if (Action === 'UNAUTHORIZE' || Action === 'REMOVE') {
      // Deactivate the store in the database if removed
      const store = await prisma.store.findFirst({
        where: {
          configurations: {
            some: {
              key: 'url',
              value: StoreUrl,
            }
          }
        }
      });

      if (store) {
        await prisma.store.update({
          where: { id: store.id },
          data: { connectionStatus: 'inactive', syncStatus: 'idle' }
        });
        console.log(`[Shift4Shop OAuth Callback] Store ${StoreUrl} deactivated.`);
      }
    }

    return res.json({ success: true });
  } catch (error: any) {
    console.error('[Shift4Shop OAuth Callback] Error:', error.message || error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
};

/**
 * Handles GET /api/v1/store/shift4shop/redirect (OAuth Authorization Code Flow)
 */
export const handleShift4ShopRedirect = async (req: Request, res: Response) => {
  try {
    const { store_url, token, code, state, error } = req.query;

    if (error) {
      console.error('[Shift4Shop OAuth Redirect] User or provider returned error:', error);
      return res.status(400).send(`Authentication failed: ${error}`);
    }

    const publicKey = process.env.SHIFT4SHOP_PUBLIC_KEY || 'YOUR_SHIFT4SHOP_PUBLIC_KEY';
    const apiKey = process.env.SHIFT4SHOP_API_KEY || 'YOUR_SHIFT4SHOP_API_KEY';
    const redirectUri = process.env.SHIFT4SHOP_REDIRECT_URL || 'https://your-middleware-domain.com/api/v1/store/shift4shop/redirect';
    const frontendUrl = process.env.FRONTEND_URL || '/stores';

    // Step 1: Initiate OAuth if there is no authorization code in the URL
    if (!code) {
      if (!store_url) {
        return res.status(400).send('Missing store_url query parameter required to initiate authorization.');
      }

      // Clean up the store URL to ensure it has protocol
      let targetStoreUrl = store_url as string;
      if (!targetStoreUrl.startsWith('http://') && !targetStoreUrl.startsWith('https://')) {
        targetStoreUrl = `https://${targetStoreUrl}`;
      }

      // State holds the target store URL to retrieve after redirect callback
      const authorizeUrl = `https://apirest.3dcart.com/oauth/authorize?client_id=${publicKey}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&store_url=${encodeURIComponent(targetStoreUrl)}&state=${encodeURIComponent(targetStoreUrl)}`;
      console.log(`[Shift4Shop OAuth Redirect] Initiating OAuth redirect to: ${authorizeUrl}`);
      return res.redirect(authorizeUrl);
    }

    // Step 2: Exchange Authorization Code for Access Token
    const targetStoreUrl = (state as string) || (store_url as string);
    if (!targetStoreUrl) {
      return res.status(400).send('Missing store url (state) to bind access token to.');
    }

    console.log(`[Shift4Shop OAuth Redirect] Exchanging code: ${code} for access token for store: ${targetStoreUrl}`);

    const tokenResponse = await axios.post(
      'https://apirest.3dcart.com/oauth/token',
      new URLSearchParams({
        code: code as string,
        client_id: publicKey,
        client_secret: apiKey,
        grant_type: 'authorization_code',
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const { access_token } = tokenResponse.data;
    if (!access_token) {
      throw new Error('Shift4Shop OAuth token response did not contain access_token.');
    }

    console.log(`[Shift4Shop OAuth Redirect] Token acquired successfully. Creating/updating store: ${targetStoreUrl}`);

    // Parse domain name as the store key prefix
    const hostname = new URL(targetStoreUrl).hostname;
    const storePrefix = hostname.replace(/\.shift4shop\.com|\.3dcart\.com/g, '').replace(/[^a-z0-9_]/g, '_');

    // Find if store already exists
    let store = await prisma.store.findFirst({
      where: {
        configurations: {
          some: {
            key: 'url',
            value: targetStoreUrl,
          }
        }
      },
      include: { credentials: true }
    });

    if (store) {
      // Update access credentials
      await prisma.storeCredential.updateMany({
        where: { storeId: store.id },
        data: {
          accessToken: access_token,
          encryptedAccessToken: encryptSecret(access_token),
          storeUrl: targetStoreUrl,
        }
      });

      await prisma.store.update({
        where: { id: store.id },
        data: {
          connectionStatus: 'active',
          syncStatus: 'synced',
          lastSync: new Date(),
        }
      });
      console.log(`[Shift4Shop OAuth Redirect] Updated credentials for existing store ID: ${store.id}`);
    } else {
      // Create new store and credentials
      const newStore = await prisma.store.create({
        data: {
          name: storePrefix.toUpperCase().replace(/_/g, ' ') || 'Shift4Shop Storefront',
          type: 'shift4shop',
          storeKey: `${storePrefix}_${Math.floor(1000 + Math.random() * 9000)}`,
          connectionStatus: 'active',
          syncStatus: 'synced',
          lastSync: new Date(),
          configurations: {
            create: [
              { key: 'url', value: targetStoreUrl },
              { key: 'region', value: 'North America' }
            ]
          },
          credentials: {
            create: {
              accessToken: access_token,
              encryptedAccessToken: encryptSecret(access_token),
              storeUrl: targetStoreUrl,
            }
          }
        }
      });
      console.log(`[Shift4Shop OAuth Redirect] Created new store storefront with ID: ${newStore.id}`);
    }

    // Redirect merchant back to frontend store settings dashboard
    return res.redirect(frontendUrl);
  } catch (error: any) {
    console.error('[Shift4Shop OAuth Redirect] Error:', error.response?.data || error.message);
    return res.status(500).send(`OAuth authorization failed: ${error.message}`);
  }
};
