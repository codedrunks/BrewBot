import { probit } from "simple-statistics";
import memoize from "fast-memoize";

/**
 * Uses black magic and "Wilson score confidence interval for a Bernoulli parameter" to calculate a sortable score from upvotes and downvotes.  
 * See more info [here.](https://www.evanmiller.org/how-not-to-sort-by-average-rating.html)
 * @returns Returns a score between 0 and 1
 */
export function rankVotes(upvotes: number, downvotes: number, confidence = 0.95)
{
    const votesAmt = upvotes + downvotes;

    if(votesAmt === 0) return 0;

    // for performance purposes you might consider memoize the calcuation for z
    const z = memoize(probit)(1 - (1 - confidence) / 2);

    // p̂, the fraction of upvotes
    const phat = 1.0 * upvotes / votesAmt;

    return (phat + z * z / (2 * votesAmt) - z * Math.sqrt((phat * (1 - phat) + z * z / (4 * votesAmt)) / votesAmt)) / (1 + z * z / votesAmt);
}
