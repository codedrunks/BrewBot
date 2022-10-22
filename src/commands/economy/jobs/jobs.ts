interface JobLevelObj {
    name: string;
    multiplier: number;
    worksRequired: number;
    phrases: string[];
}


const baseAward = 50;

const jobLevels: Record<number, JobLevelObj> = {
    1: {
        name: "Beggar",
        multiplier: .1,
        worksRequired: 0,
        phrases: [
            "begging for a few hours on the street corner",
            "selling your kidney",
            "eating a worm",
            "singing on the subway",
            "doing drugs",
            "sleeping"
        ]
    },
    2: {
        name: "McDonald's Employee",
        multiplier: .4,
        worksRequired: 10,
        phrases: [
            "flipping patties",
            "getting beaten by your manager",
            "getting berated by customers",
        ]
    },
    3: {
        name: "ShitCoin Trader",
        multiplier: .8,
        worksRequired: 25,
        phrases: [
            "selling some doge",
            "foreseeing the future",
            "trading some CarenCoin for BirbCoin"
        ]
    },
    4: {
        name: "Twitch Streamer",
        multiplier: 1,
        worksRequired: 50,
        phrases: [
            "destroying some 12 year olds",
            "playing some fortnite",
            "losing in Mario Kart",
            "dying to 12 year olds"
        ]
    },
    5: {
        name: "E-Thot",
        multiplier: 1.5,
        worksRequired: 100,
        phrases: [
            "selling feet pics",
            "enticing men",
            "doing nothing",
            "contributing nothing to society"
        ]
    },
    6: {
        name: "CEO of FartBux",
        multiplier: 2.2,
        worksRequired: 200,
        phrases: [
            "providing value to your company",
            "adding to the price of FartBux",
            "getting new investors",
            "stealing from retail investors"
        ]
    },
    7: {
        name: "Jeff Bezos Jr.",
        multiplier: 3,
        worksRequired: 300,
        phrases: [
            "consuming the blood of children",
            "using your dad's wealth to build your own",
            "\"inventing\" something that was already in use",
            "yelling at factory workers for several hours"
        ]
    },
    8: {
        name: "Elon Musk, Lord and King of Mars",
        multiplier: 5,
        worksRequired: 500,
        phrases: [
            "inventing new particles such as Assium and Coomium",
            "stealing your employees' ideas",
            "harnessing the power of the sun",
            "watching over your fellow rich folk on Mars"
        ]
    }
};

function totalWorksToLevel(works: number) {
    const entries = Object.entries(jobLevels)
        .reverse()
        .map(([l, o]) => ([Number(l), o])) as [number, JobLevelObj][];

    for(const [lvl, { worksRequired }] of entries) {
        if(works >= worksRequired)
            return lvl;
    }
    return 1;
}

export {
    baseAward,
    jobLevels,
    totalWorksToLevel,
};
