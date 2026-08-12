export type IdRoute = { params: Promise<{ id: string }> };
export type SceneRoute = { params: Promise<{ id: string; sceneId: string }> };
export type MediaRoute = { params: Promise<{ path: string[] }> };
