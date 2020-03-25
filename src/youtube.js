import React, { useState } from 'react';
import { Button,
  FormControl,
  MenuItem,
  Select,
} from '@material-ui/core';
import { database } from './index';
import VideoList from './video-list';

function Youtube() {
  const baseUrl = "https://www.googleapis.com/youtube/v3/";
  const api_key = process.env.REACT_APP_YT_KEY;
  let latestVideoId = '';
  let videos = [];
  const [selectedChannel, setSelectedChannel] = useState('b2s');
  const [dbVideos, setDbVideos] = useState([]);
  const channels = {
    art_of_dance: {
      title: 'Art of Dance',
      id: 'UCWA006v5cHRVqJvwlzRxuHg',
    },
    bass_events: {
      title: 'Bass Events',
      id: 'UCGgQpBr1shI3IL4pVZ9Cplg',
    },
    b2s: {
      title: 'B2S',
      id: 'UCVLolPmtm4IPMHx5k0GISHg',
    },
    q_dance: {
      title: 'Q-dance',
      id: 'UCAEwCfBRlB3jIY9whEfSP5Q',
    },
  };

  const getNewVidsFromYoutube = (channel, pageToken) => {
    const id = channels[channel].id;
    const page = pageToken ? '&pageToken=' + pageToken : '';

    fetch(baseUrl + "search?part=snippet%2Cid&channelId=" + id + "&maxResults=50&order=date&type=video&videoDuration=long&key=" + api_key + page)
      .then(res => res.json())
      .then(result => {
        let upToDate = false;
        const items = result.items ? result.items : [];

        for (let i = 0; i < items.length; i++) {
          if (latestVideoId && items[i].id.videoId === latestVideoId) {
            upToDate = true;
            break;
          }

          var videoObj = {
            id: items[i].id.videoId,
            details: items[i].snippet,
          };
          console.log('Adding: ', items[i].id.videoId);
          videos.push(videoObj);
        }
        
        if (result.nextPageToken && !upToDate) {
          console.log('Going next page ', result.nextPageToken);
          getNewVidsFromYoutube(channel, result.nextPageToken);
        } else {
          addVideosToDB();
        };
      },
      error => {
        console.log(error);
      });
  }

  const addVideosToDB = () => {
    console.log('Adding all videos');
    let updates = {};
    console.log(videos.length);
    videos.forEach(video => {
      updates['/videos/' + video.details.channelTitle + '/' + video.id] = video.details;
      console.log(video.details);
    });
    database.ref().update(updates)
      .then()
      .catch(err => console.log(err));
  }

  const setLatestVidFromDB = channel => {
    const channelName = channels[channel].title;
    var tempVideos = [];
    database.ref().child('/videos/' + channelName).orderByChild('publishedAt').once('value', snapshot => {
      snapshot.forEach(video => {
        const tempVideo = {
          id: video.key,
          details: video.val(),
        };
        tempVideos.push(tempVideo);
      });
      latestVideoId = tempVideos.length > 0 && tempVideos[tempVideos.length - 1].id;
      console.log('set latest vid id', latestVideoId);
      getNewVidsFromYoutube(channel);
    });
  }

  const getVidsFromDB = channel => {
    const channelName = channels[channel].title;
    var tempVideos = [];
    database.ref().child('/videos/' + channelName).orderByChild('publishedAt').on('value', snapshot => {
      snapshot.forEach(video => {
        const tempVideo = {
          id: video.key,
          details: video.val(),
        };
        tempVideos.push(tempVideo);
        console.log(tempVideo.details.publishedAt);
      });
      setDbVideos(tempVideos.reverse());
    });
  }

  const handleFetchAllClick = channel => {
    videos = [];
    latestVideoId = '';
    getNewVidsFromYoutube(channel);
  }

  const handleFetchNewClick = channel => {
    videos = [];
    setLatestVidFromDB(channel);
  }

  const handleSelectChange = event => {
    setSelectedChannel(event.target.value);
  }

  const testFunction = () => {
    let re = /([0-9]{4}( \| )|( - ))/;
    dbVideos.forEach(video => {
      console.log('T: ', video.details.title);
      const arr = video.details.title.split(re);
      console.log('S: ', arr[arr.length-1]);
    })
  }

  return (
    <div>
      <div>
        <div>
          <FormControl>
            <Select
              value={selectedChannel}
              onChange={handleSelectChange}
            >
              {
                Object.keys(channels).map(key => (
                  <MenuItem value={key} key={key}>{channels[key].title}</MenuItem>
                ))
              }
            </Select>
          </FormControl>
        </div>
        <Button
          className="user-button"
          variant="contained"
          color="primary"
          onClick={() => getVidsFromDB(selectedChannel)}>Get Vids From DB</Button>
        <Button
          className="user-button"
          variant="contained"
          color="secondary"
          onClick={() => handleFetchAllClick(selectedChannel)}>Fetch All Videos</Button>
        <Button
          className="user-button"
          variant="contained"
          color="secondary"
          onClick={() => handleFetchNewClick(selectedChannel)}>Fetch New Videos</Button>
      </div>
      <VideoList videos={dbVideos}></VideoList>
    </div>
  )
}

export default Youtube;