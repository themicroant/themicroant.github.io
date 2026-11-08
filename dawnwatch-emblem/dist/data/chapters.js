const STARTS = [[1, 7], [2, 7], [3, 7], [4, 7]];
export const CHAPTERS = [
    {
        num: 1, name: 'Embers at the Border', objective: 'Defeat all enemies', recLevel: 1,
        map: ['PPFPPP', 'PPPPFP', 'FPPPPP', 'PP~~PP', 'PPPPPF', 'PFPPPP', 'PPPPTP', 'WPPPPW'],
        starts: STARTS,
        enemies: [
            { type: 'e_axe', level: 1, col: 1, row: 1 },
            { type: 'e_axe', level: 1, col: 4, row: 2 },
            { type: 'e_bow', level: 1, col: 3, row: 0 },
            { type: 'e_dark', level: 1, col: 2, row: 1 },
        ],
        joins: ['p_staff'],
    },
    {
        num: 2, name: 'Whispering Pines', objective: 'Defeat all enemies', recLevel: 2,
        map: ['FPPPPF', 'PFPPFP', 'PPFPPP', 'PFPPFP', 'PPPFPP', 'FPTPPF', 'PPPPFP', 'WPPPPW'],
        starts: STARTS,
        enemies: [
            { type: 'e_axe', level: 2, col: 1, row: 0 },
            { type: 'e_bow', level: 2, col: 4, row: 0 },
            { type: 'e_cav', level: 2, col: 3, row: 1 },
            { type: 'e_dark', level: 2, col: 2, row: 1 },
            { type: 'e_flier', level: 2, col: 5, row: 1 },
        ],
        joins: ['p_bow'],
    },
    {
        num: 3, name: 'The Drowned Causeway', objective: 'Defeat all enemies', recLevel: 3,
        map: ['WPPPPW', 'PPFPPP', 'PPPPPF', '~~P~P~', 'PPPPPP', 'PFPPFP', 'PPPTPP', 'WPPPPW'],
        starts: STARTS,
        enemies: [
            { type: 'e_armor', level: 3, col: 3, row: 1 },
            { type: 'e_flier', level: 3, col: 1, row: 0 },
            { type: 'e_bow', level: 3, col: 4, row: 0 },
            { type: 'e_heal', level: 3, col: 2, row: 0 },
            { type: 'e_cav', level: 3, col: 4, row: 2 },
        ],
        joins: ['p_dagger', 'p_gtome'],
    },
    {
        num: 4, name: 'Siege of Greyhold', objective: 'Defeat all enemies', recLevel: 4,
        map: ['WPPPPW', 'PTPPTP', 'PWPPWP', 'PPPPPP', 'FPMMPF', 'PPPPPP', 'PFPPFP', 'WPPPPW'],
        starts: STARTS,
        enemies: [
            { type: 'e_armor', level: 4, col: 1, row: 1 },
            { type: 'e_armor', level: 4, col: 4, row: 1 },
            { type: 'e_bow', level: 4, col: 2, row: 0 },
            { type: 'e_dark', level: 4, col: 3, row: 0 },
            { type: 'e_heal', level: 4, col: 3, row: 1 },
            { type: 'e_cav', level: 5, col: 3, row: 2 },
        ],
        joins: [],
    },
    {
        num: 5, name: 'The Hollow Throne', objective: 'Defeat the commander', recLevel: 5,
        map: ['WPPPPW', 'PTPPTP', 'FPWWPF', 'PPPPPP', 'PP~~PP', 'PFPPFP', 'PPPTPP', 'WPPPPW'],
        starts: STARTS,
        enemies: [
            { type: 'e_boss', level: 6, col: 2, row: 0 },
            { type: 'e_armor', level: 5, col: 2, row: 1 },
            { type: 'e_flier', level: 5, col: 3, row: 1 },
            { type: 'e_bow', level: 5, col: 1, row: 0 },
            { type: 'e_dark', level: 5, col: 4, row: 0 },
            { type: 'e_heal', level: 5, col: 3, row: 0 },
            { type: 'e_cav', level: 6, col: 4, row: 2 },
        ],
        joins: [],
    },
];
export function chapterOf(num) {
    const c = CHAPTERS.find((x) => x.num === num);
    if (!c)
        throw new Error('Unknown chapter ' + num);
    return c;
}
//# sourceMappingURL=chapters.js.map