import { orpc } from "../lib/api";

export const beatsQuery = (enabled: boolean) => orpc.studio.beats.queryOptions({ enabled });
export const songsQuery = (enabled: boolean) => orpc.studio.songs.queryOptions({ enabled });
export const songEngineQuery = () => orpc.studio.songEngine.queryOptions();
export const generatePatternMutation = () => orpc.studio.generatePattern.mutationOptions();
export const saveBeatMutation = () => orpc.studio.saveBeat.mutationOptions();
export const deleteBeatMutation = () => orpc.studio.deleteBeat.mutationOptions();
export const generateSongMutation = () => orpc.studio.generateSong.mutationOptions();
