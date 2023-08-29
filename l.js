const { spawn } = require('child_process');
const ffmpeg = require('fluent-ffmpeg');



const { exec } = require('child_process');










function scaleDimensions(width, height, maxWidth = 1080, maxHeight = 1300) {
    // Calculate the width and height scaling ratios.
    const widthRatio = maxWidth / width;
    const heightRatio = maxHeight / height;
    
    // Use the smaller of the two ratios.
    const scaleRatio = Math.min(widthRatio, heightRatio);
    
    // Calculate the scaled dimensions.
    const scaledWidth = Math.round(width * scaleRatio);
    const scaledHeight = Math.round(height * scaleRatio);
    
    return {
        width: scaledWidth,
        height: scaledHeight
    };
}













async function getVideoDimensions(filePath) {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
            if (err) {
                reject(err);
                return;
            }

            const { width, height } = metadata.streams[0];
            resolve({ width, height });
        });
    });
}













async function generateFilterForText(lines, height, numOfLines) {
    let filter = '';
    let currentY = 960 - (height / 2) - (numOfLines * 64) - 10;
    console.log("Current Y:", currentY);
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].replace(/'/g, "\\'");  // Escape single quotes
        filter += `[${i === 0 ? "1:v" : "bg_with_text" + i}]drawtext=fontfile='/Windows/Fonts/seguiemj.ttf':text='${line}':fontsize=50:fontcolor=white:x=(w-text_w)/2:y=${currentY}[bg_with_text${i + 1}];`;
        currentY += 64;
    }
    
    filter += `[0:v]scale=w='if(gt(a,1080/1300),1080,-1)':h='if(gt(a,1080/1300),-1,1300)':force_original_aspect_ratio=decrease[scaled_video];[bg_with_text${lines.length}][scaled_video]overlay=(W-w)/2:(H-h)/2[outv]`;

    return filter;
}


async function getVideoDuration(filePath) {
    return new Promise((resolve, reject) => {
        const cmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 ${filePath}`;
        
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                console.error('Error executing command:', error);
                reject(error);
            }
            
            const duration = parseFloat(stdout.trim());  // Convert the output string to a number
            resolve(duration);
        });
    });
}








async function addTextToVideo(inputVideo, outputVideo, text, callback) {
    let videoDimensions = await getVideoDimensions(inputVideo);
    let scaledDimensions = scaleDimensions(videoDimensions.width,videoDimensions.height);
    let vidLength = await getVideoDuration(inputVideo);
    console.log(scaledDimensions);
    console.log(scaledDimensions.height, scaledDimensions.width)
    let wrapper = wrapTextToWidth(text, 980);
    const textLines = wrapper.lines;
    const filters = await generateFilterForText(textLines, scaledDimensions.height, wrapper.lineCount);
    console.log("Filter:", filters);

    const args = [
        '-y', '-i', inputVideo,
        '-f', 'lavfi', '-i', 'color=c=001324:s=1080x1920:d=' + vidLength,   // Create a blue background
        '-filter_complex', filters,
        '-map', '[outv]', '-an',
        outputVideo
    ];

    const ffmpeg = spawn('ffmpeg', args);
    ffmpeg.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
    });

    ffmpeg.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
    });

    ffmpeg.on('close', (code) => {
        if (code !== 0) {
            return callback(new Error(`ffmpeg process exited with code ${code}`));
        }
        console.log('Video processed successfully.');
        callback(null);
    });
}














const { createCanvas, registerFont } = require('canvas');

// Register the font
registerFont('/Windows/Fonts/seguiemj.ttf', { family: 'Segoe UI Emoji' });

function wrapTextToWidth(text, maxWidth = 1080, fontSize = '50') {
    const canvas = createCanvas(maxWidth, 1920); // height doesn't matter here
    const ctx = canvas.getContext('2d');
    ctx.font = fontSize + 'px "Segoe UI Emoji"';

    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0];
    let maxWidthReached = 0;  // Track the maximum width reached
    
    for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const width = ctx.measureText(currentLine + " " + word).width;

        // Before breaking the line, update the maxWidthReached if this line's width is the longest so far
        if (width >= maxWidth) {
            if (ctx.measureText(currentLine).width > maxWidthReached) {
                maxWidthReached = ctx.measureText(currentLine).width;
            }
            lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine += " " + word;
        }
    }
    lines.push(currentLine); // push last line

    // Check width for the last line
    const lastLineWidth = ctx.measureText(currentLine).width;
    if (lastLineWidth > maxWidthReached) {
        maxWidthReached = lastLineWidth;
    }

    const lineHeight = parseFloat(fontSize); // approximation
    const totalHeight = lines.length * lineHeight;

    return {
        lines: lines,
        lineCount: lines.length,
        totalHeight: totalHeight,
        maxWidthReached: maxWidthReached  // This returns the maximum width reached
    };
}




























// ... [rest of your code]

// Usage:
const yourText = "This is what happened when my dog decided to go outside today";
addTextToVideo('video.mp4', 'final_scaled_combined_test.mp4', yourText, (err) => {
    if (err) {
        console.error('Failed to process video:', err);
    }
});
