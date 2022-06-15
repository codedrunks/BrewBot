export interface ILevel {
    [key: number]: {
        name: string,
        multiplier: number,
        phrases: string[]
    }
}

export const Levels: ILevel = {
    1: {
        name: "Beggar",
        multiplier: .1,
        phrases: [
            "begging for a few hours on the street corner",
            "selling your kidney",
            "eating a worm",
            "singing on the subway",
            "doing drugs"
        ]
    },
    2: {
        name: "McDonald's Employee",
        multiplier: .4,
        phrases: [
            "flipping patties",
            "getting beaten by your manager",
            "getting berated by customers",
        ]
    },
    3: {
        name: "ShitCoin Trader",
        multiplier: .8,
        phrases: [
            "selling some doge",
            "foreseeing the future",
            "trading some CarenCoin for BirbCoin"
        ]
    },
    4: {
        name: "Twitch Streamer",
        multiplier: 1,
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
        phrases: [
            "inventing new particles such as Assium and Coomium",
            "stealing your employees' ideas",
            "harnessing the power of the sun",
            "watching over your fellow rich folk on Mars"
        ]
    }
}

export const totalWorksToLevel = (works: number): number => {
    // let worksMap = [0, 10, 25, 50, 100, 200, 300, 500];
    if(works >= 500) return 8;
    else if(works >= 300) return 7;
    else if(works >= 200) return 6;
    else if(works >= 100) return 5;
    else if(works >= 50) return 4;
    else if(works >= 25) return 3;
    else if(works >= 10) return 2;
    else return 1;
}

export const baseAward = 50;