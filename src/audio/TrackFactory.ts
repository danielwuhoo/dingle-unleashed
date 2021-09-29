import { singleton } from 'tsyringe';
import YoutubeTrack from './YoutubeTrack';
import Track from './Track';

@singleton()
export default class TrackFactory {
    public static createTrack(query: string): Track {
        return new YoutubeTrack(query);
    }
}
