<script>
    export let kural;
    export let kuralEnn;

    let section, chapter, subChapter;

    function findKuralDetails () {
        let ke = kuralEnn + 1;

        for (let i = 0; i < window.kuralIndices.length; i++) {
            let [start, end] = window.kuralIndices[i].kurals;

            if (ke <= end && ke >= start) {
                let section1 = window.kuralIndices[i];
                section = [section1.name, section1.translation];

                for (let i = 0; i < section1.chapters.length; i++) {
                    [start, end] = section1.chapters[i].kurals;

                    if (ke <= end && ke >= start) {
                        let chapter1 = section1.chapters[i];
                        chapter = [chapter1.name, chapter1.translation];

                        for (let i = 0; i < chapter1.chapters.length; i++) {
                            [start, end] = chapter1.chapters[i].se;

                            if (ke <= end && ke >= start) {
                                let subChapter1 = chapter1.chapters[i];
                                return subChapter = [subChapter1.name, subChapter1.translation];
                            }
                        }

                        return;
                    }
                }
                
                return;
            }
        }
    }

    findKuralDetails()
</script>

<p class="tamil">குறள் {kuralEnn + 1}</p>

{#each kural.li.split('\n') as ln}
    <p class="tamil kural-line">{ln}</p>
{/each}

<div class="vilakam">
    <p class="tamil ktlr kural-bold">பால் </p><p class="english ktlr kural-bold">/Section: </p>
    <p class="tamil ktlr">{section[0]}</p><p class="english ktlr">/{section[1]}</p><br/>

    <p class="tamil ktlr kural-bold">இயல் </p><p class="english ktlr kural-bold">/Chapter: </p>
    <p class="tamil ktlr">{chapter[0]}</p><p class="english ktlr">/{chapter[1]}</p><br/>

    <p class="tamil ktlr kural-bold">அதிகாரம் </p><p class="english ktlr kural-bold">/Sub-Chapter: </p>
    <p class="tamil ktlr">{subChapter[0]}</p><p class="english ktlr">/{subChapter[1]}</p>
</div>

<div class="vilakam">
    <p class="tamil kural-bold">மு.வரதராசன் அவர்களின் விளக்கம்</p>
    <p class="tamil">{kural.def[0]}</p>
</div>

<div class="vilakam">
    <p class="tamil kural-bold">சாலமன் பாப்பையா அவர்களின் விளக்கம்</p>
    <p class="tamil">{kural.def[1]}</p>
</div>

<div class="vilakam">
    <p class="tamil kural-bold">சிவயோகி சிவக்குமார் அவர்களின் விளக்கம்</p>
    <p class="tamil">{kural.def[2]}</p>
</div>

<div class="vilakam">
    <p class="english kural-bold">English Couplet</p>
    <p class="english kural-english">{kural.cpl}</p>

    <p class="english kural-bold">English Definition</p>
    <p class="english kural-english">{kural.tl}</p>

    <p class="english kural-bold">English Transliteration</p>
    {#each kural.tlr.split('\n') as ln}
        <p class="english kural-english">{ln}</p>
    {/each}
</div>