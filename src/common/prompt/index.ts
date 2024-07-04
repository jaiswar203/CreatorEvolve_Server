export const generateSummaryForDiagnosedResultOfTheAudio = (data: any) => `
        Given the following data:

        ${JSON.stringify(data, null, 2)}

        Generate a summary object with the following structure:

        {
        "summary": {
            "speech": "Summarize speech data, including percentage and events",
            "noise_quality": "Summarize noise score data, including average and distribution highlights",
            "voice_quality": "Summarize quality score data, including average, distribution highlights, and worst segment. For example: This score shows how good the overall quality is. A score of [quality_score_average * 10]% means the quality is okay but could be better."
        }
        }

        Generate a concise summary for each field based on the provided data. 

        Note: Return only the summary object as valid JSON.
`;

export const generateDetailedInfoOnLoudness = (
  loudness: object,
  platform: string,
) => {
  return `
    Analyze the following audio loudness data:
    Loudness: ${JSON.stringify(loudness)}

    Loudness Profile:
    | Platform/Service      | Ideal Loudness Level | Minimum Loudness  | Max Volume Peaks |
    |-----------------------|----------------------|-------------------|------------------|
    | ATSC A/85 TV Standard | Quiet TV audio at -22 | Minimum -26      | Peaks up to -2   |
    | EBU R128 TV Standard  | Quiet TV audio at -22.5 | Minimum -23.5  | Peaks up to -1   |
    | Amazon                | Medium audio at -13  | Minimum -15       | Peaks up to -1   |
    | Apple                 | Medium audio at -15  | Minimum -17       | Peaks up to -1   |
    | Facebook              | Medium audio at -15  | Minimum -17       | Peaks up to -1   |
    | Pandora               | Medium audio at -13  | Minimum -15       | Peaks up to -1   |
    | Spotify               | Medium audio at -13  | Minimum -15       | Peaks up to -1   |
    | SoundCloud            | Medium audio at -13  | Minimum -15       | Peaks up to -1   |
    | Vimeo                 | Medium audio at -15  | Minimum -17       | Peaks up to -1   |
    | YouTube               | Louder audio at -12  | Minimum -14       | Peaks up to -1   |
    | Laptop Playback       | Balanced audio at -14 | Minimum -18      | Peaks up to -1   |
    | Mobile Playback       | Balanced audio at -15 | Minimum -17      | Peaks up to -1   |

    User Input: ${platform}
    Task: Compare the given loudness values to the ideal profile for ${platform}. Provide a brief assessment (2-3 sentences) of how well the audio meets ${platform}'s standards. Include one key recommendation to optimize the audio for ${platform}. Keep the response concise and focused on the most important aspects for ${platform} optimization.
    `;
};

export const generateIdealLoudnessObjectForPlatform = (
  loudness: object,
  platform: string,
) => {
  return `
    Analyze the following audio loudness data:
    ${loudness}

    Loudness Profile:
        | Platform/Service      | Ideal Loudness Level | Minimum Loudness  | Max Volume Peaks |
        |-----------------------|----------------------|-------------------|------------------|
        | ATSC A/85 TV Standard | Quiet TV audio at -22 | Minimum -26      | Peaks up to -2   |
        | EBU R128 TV Standard  | Quiet TV audio at -22.5 | Minimum -23.5  | Peaks up to -1   |
        | Amazon                | Medium audio at -13  | Minimum -15       | Peaks up to -1   |
        | Apple                 | Medium audio at -15  | Minimum -17       | Peaks up to -1   |
        | Facebook              | Medium audio at -15  | Minimum -17       | Peaks up to -1   |
        | Pandora               | Medium audio at -13  | Minimum -15       | Peaks up to -1   |
        | Spotify               | Medium audio at -13  | Minimum -15       | Peaks up to -1   |
        | SoundCloud            | Medium audio at -13  | Minimum -15       | Peaks up to -1   |
        | Vimeo                 | Medium audio at -15  | Minimum -17       | Peaks up to -1   |
        | YouTube               | Louder audio at -12  | Minimum -14       | Peaks up to -1   |
        | Laptop Playback       | Balanced audio at -14 | Minimum -18      | Peaks up to -1   |
        | Mobile Playback       | Balanced audio at -15 | Minimum -17      | Peaks up to -1   |

    User Input: ${platform}

    Generate a JSON object with the following structure, filling in the values based on the given audio data and the profile for the ${platform}:
    {
      "loudness": {
        "target_level": [Platform's ideal loudness level],
        "peak_limit": [Platform's max volume peak],
        "peak_reference": [Use "true_peak" if provided in audio data, otherwise "sample"]
      }
    }
`;
};
