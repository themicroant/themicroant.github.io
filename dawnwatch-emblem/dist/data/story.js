const L = (speaker, text) => ({ speaker, text });
export const PROLOGUE = [
    L('narrator', 'The kingdom of Aldermere lay quiet for a hundred years. Then the Ashen Legion came out of the north.'),
    L('narrator', 'Its general, the sorcerer Morvane, burns every village between the border and the capital.'),
    L('narrator', 'Only the Dawnwatch, a small company of oathsworn guards, stands between him and the throne.'),
    L('p_sword', 'Four of us, then. I have faced worse odds. Briefly. In a dream.'),
    L('p_lance', 'Four is a fine number. It fits around one campfire.'),
    L('p_flier', "It also fits on very fast horses. Let's go!"),
];
export const EPILOGUE = [
    L('narrator', 'By spring, the fields of Aldermere were green again, and the roads were busy with carts instead of soldiers.'),
    L('p_sword', 'I never thought we would reach the capital with all eight of us.'),
    L('p_bow', 'I never thought a king would thank me for a good shot.'),
    L('p_dagger', 'I never thought a king would be that short.'),
    L('p_gtome', 'A new orchard will grow where the Legion made camp. I have already chosen the pear trees.'),
    L('narrator', 'The Dawnwatch kept its oath, one dawn at a time.'),
];
export const STORY = {
    1: {
        pre: [
            L('p_tome', 'Smoke on the ridge. The border farms are burning, Kael.'),
            L('p_sword', 'Then that is where we begin. Stay close and watch the flanks.'),
            L('e_axe', 'The Dawnwatch? Ha! I expected an army, not a picnic.'),
            L('p_lance', 'The picnic is over. Shields up.'),
        ],
        post: [
            L('e_axe', 'Ugh... the general will hear of this...'),
            L('p_flier', 'Ow. My pride is hurt. And my arm. Mostly the arm.'),
            L('p_staff', 'Hold still. I am a healer, and your arm is about to become far less interesting.'),
            L('p_sword', 'Then you are exactly who we need. Will you walk with us?'),
            L('p_staff', 'Gladly. Somebody has to carry the bandages.'),
        ],
    },
    2: {
        pre: [
            L('narrator', 'The road to the capital runs through the Whispering Pines, where old trees block out the sky.'),
            L('p_flier', 'Too quiet. I hate it when the woods hold their breath.'),
            L('e_bow', 'Hold still, little flier. These pines belong to us.'),
            L('p_staff', 'Everyone stay close, please. I can only heal what I can reach.'),
        ],
        post: [
            L('e_bow', 'You are... faster than the reports said.'),
            L('p_bow', 'I watched that whole fight from a tree. You are loud, but you are good.'),
            L('p_sword', 'A hunter of these woods?'),
            L('p_bow', 'Was. The Legion burned my cabin. I would like to return the favour.'),
            L('p_lance', 'A bow is always welcome.'),
        ],
    },
    3: {
        pre: [
            L('narrator', 'Beyond the pines, the Greywater river cuts the road in two. Only two stone bridges remain.'),
            L('p_tome', 'Legion banners on the far bank. Fliers, and a heavy knight guarding the bridge.'),
            L('e_cav', 'Come across, then. We will enjoy the splash.'),
            L('p_lance', 'I dislike getting wet. I dislike being laughed at more.'),
            L('p_sword', 'One bridge at a time. Move!'),
        ],
        post: [
            L('e_cav', 'My lance... was supposed to be... faster...'),
            L('p_dagger', 'Pssst. Up here. Nice bridge work, by the way. Very loud. Very shiny.'),
            L('p_sword', 'A scout? Who sent you?'),
            L('p_dagger', "Nobody. I got bored of the Legion's cooking. I know the way into Greyhold."),
            L('p_gtome', 'And I know the forest paths around it. Perhaps we can be of use.'),
        ],
    },
    4: {
        pre: [
            L('narrator', 'Greyhold, the old border fortress, has fallen to the Legion. Its gates stand open like a trap.'),
            L('p_dagger', 'Because it is a trap. Obviously. I counted six guards and one very grumpy healer.'),
            L('p_gtome', 'Then we spring it carefully, and from the right side.'),
            L('e_armor', 'No one passes Greyhold while Bulwark stands. Come and bruise yourselves.'),
            L('p_lance', 'Finally, someone my size.'),
            L('p_tome', 'Healer first, or he will undo every cut we make.'),
        ],
        post: [
            L('e_armor', 'The general waits upstairs. He will not be so... polite.'),
            L('p_bow', 'Polite? He set a village on fire.'),
            L('p_sword', 'Then it ends tonight. Rest, everyone. At dawn, we climb to the Hollow Throne.'),
        ],
    },
    5: {
        pre: [
            L('narrator', 'At the top of Greyhold, the Hollow Throne waits, and a man in a black cloak sits upon it as if it were his.'),
            L('e_boss', 'The Dawnwatch. I was told there were fifty of you. I count eight.'),
            L('p_sword', 'Then you will have to count again when we are done.'),
            L('e_boss', 'The Hollow Crown will wake, and Aldermere will kneel. Nothing you carry can stop that.'),
            L('p_tome', 'We carry everything we have. That is usually enough.'),
            L('p_flier', 'And snacks. Those are not enough, but they help.'),
            L('e_boss', 'Enough. Ashen Legion, burn them.'),
        ],
        post: [
            L('e_boss', 'Impossible... the Crown was almost mine...'),
            L('narrator', 'With its master gone, the Hollow Crown fell silent, and the black fire in the great hall went out.'),
            L('p_lance', 'It is over. Somebody check my shield. I think it is laughing at me.'),
            L('p_staff', 'Sit down, all of you. I will count the bruises.'),
        ],
    },
};
//# sourceMappingURL=story.js.map