        const axios = require('axios');
        const fetch = require('node-fetch');
        const fs = require('fs');
        const { exec } = require('child_process');
        //const getURL = require('./lol');  // Import the getURL function
        const https = require('https');
        const { Readable } = require('stream');
        var mpdParser = require('mpd-parser');
        const { parse } = require('path');
        const ffmpeg = require('fluent-ffmpeg');
        
        const { wrapTextToWidth, addTextToVideo } = require('./l')



        const DOWNLOADED_VIDEOS_FILE = 'downloaded.json';

        let downloaded = [];

        if (fs.existsSync(DOWNLOADED_VIDEOS_FILE)) {
            downloaded = JSON.parse(fs.readFileSync(DOWNLOADED_VIDEOS_FILE, 'utf-8'));
        }


        async function getHottestVideoURL(page) {
            console.log(`Fetching the top 50 hottest posts from ${page}...`);
            const response = await axios.get(`https://www.reddit.com/${page}/hot.json?limit=500`);
            console.log('Processing posts to find a suitable video...');
            
            const posts = response.data.data.children;
        
            for (const post of posts) {
                if (post.data.is_video && 
                    !downloaded.includes(post.data.id) && 
                    post.data.secure_media.reddit_video.duration >= 5 && 
                    post.data.secure_media.reddit_video.duration <= 30 &&
                    !post.data.secure_media.reddit_video.is_gif &&
                    !post.data.over_18) {
                    const redditURL = post.data.secure_media.reddit_video.fallback_url;
                    const posterUsername = post.data.author;  // Get the poster's username
                    const caption = post.data.title;  // Get the caption

                    let wrapper = wrapTextToWidth(caption, 980);

                    if(wrapper.lineCount > 3) {
                        continue;
                    }

                    
        
                    console.log(`Found a suitable video with URL: ${redditURL} by user: ${posterUsername}. Caption: ${caption}`);
                    
                    downloaded.push(post.data.id);
                    fs.writeFileSync(DOWNLOADED_VIDEOS_FILE, JSON.stringify(downloaded));
                    
                    return {
                        url: redditURL,
                        username: posterUsername, 
                        caption: caption,
                        reddit: page
                    };
                }
            }
            throw new Error('No suitable video found');
        }
        

        async function download() {

        try {
            let subreddit = chooseRandomSubreddit();
            const videoData = await getHottestVideoURL(subreddit);

            if(subreddit.includes() === "porn") {
                subreddit = subreddit.toLowerCase().replace("porn", "pron");
            }
            

            console.log(`URL: ${videoData.url}`);
            console.log(`Posted by: ${videoData.username}`);
            console.log(`Caption: ${videoData.caption}`);

        
            let url = videoData.url;

            const videoFileUrl = url;

            
            const videoFileName = 'video.mp4';

            if (typeof (fetch) === 'undefined') throw new Error('Fetch API is not supported.');

            const response = await fetch(videoFileUrl);

            if (!response.ok) throw new Error('Response is not ok.');

            const writeStream = fs.createWriteStream(videoFileName);


            response.body.pipe(writeStream);


            await new Promise((resolve, reject) => {
                response.body.on('end', resolve);
                response.body.on('error', reject);
            });

            let newURL = url.replace(/\/[^/]*$/, '');

            await downloadAudio(newURL, "audio.mp4");

            
            return {
                username: videoData.username,
                caption: videoData.caption,
                reddit: subreddit
            }
        }catch (error) {
            console.error(`Error downloading video: ${error.message}`);
            
            // Retry
            return await download();
        }

            
        }
        
async function downloadAudio(url, name) {

    let manifestUri = url + "/DASHPlaylist.mpd";
    const res = await fetch(manifestUri);
    const manifest = await res.text();
    var parsedManifest = mpdParser.parse(manifest, { manifestUri });


    const videoFile = parsedManifest.mediaGroups.AUDIO.audio.main.playlists[0].sidx.uri
    
    let videoFileUrl = videoFile.replace(/\s+/g, '');

    
    const videoFileName = name;

    if (typeof (fetch) === 'undefined') throw new Error('Fetch API is not supported.');

    const response = await fetch(videoFileUrl);

    if (!response.ok) throw new Error('Response is not ok.');

    const writeStream = fs.createWriteStream(videoFileName);


    response.body.pipe(writeStream);


    await new Promise((resolve, reject) => {
        response.body.on('end', resolve);
        response.body.on('error', reject);
    });

    
}

async function combineVids() {
    console.log('Starting combineVids...');

    const videoFile = 'video.mp4';
    const audioFile = 'audio.mp4';
    const outputFile = 'output.mp4';

    return new Promise((resolve, reject) => {
        ffmpeg()
            .input(videoFile)
            .input(audioFile)
            .videoCodec('copy')
            .audioCodec('aac')
            .toFormat('mp4')
            .on('end', () => {
                console.log('Video and audio have been combined successfully!');
                console.log('Finished combineVids.');
                resolve();
            })
            .on('error', (err) => {
                console.error(`Error combining video and audio: ${err.message}`);
                reject(err);
            })
            .save(outputFile);
    });
}


function chooseRandomSubreddit() {
    const subreddits = [
        "r/Whatcouldgowrong",
        "r/CrazyFuckingVideos",
        "r/fightporn",
        "r/WinStupidPrizes"
    ];

    const randomIndex = Math.floor(Math.random() * subreddits.length);
    return subreddits[randomIndex];
}



module.exports = {
    download,
    combineVids
};

        
        
