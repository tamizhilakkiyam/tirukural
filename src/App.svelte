<script>
    import Kural from './Kural.svelte';

    const queries = new URLSearchParams(window.location.search);
    const withinKuralRange = x => x > 0 && x <= 1330;

    let loaded = [];
    let dailyKuralNumber = parseInt(localStorage.getItem('kural_aim') || '0');
    let searchQuery = queries.get('search');
    let requestedKural = parseInt(queries.get('kural'));
    
    requestedKural = isNaN(requestedKural) ? null : requestedKural;

    function parseSearchQuery (query) {
        let intParsed = parseInt(query);
        if (!isNaN(intParsed)) return requestedKural = intParsed;
    }

    function updateDailyKuralNumber (x) {
        if (!withinKuralRange(dailyKuralNumber)) return;
        dailyKuralNumber = dailyKuralNumber + x;
        localStorage.setItem('kural_aim', dailyKuralNumber);
    }

    fetch('/tirukkural.json')
        .then(res => res.json())
        .then(body => {
            loaded = body;
            parseSearchQuery(searchQuery);
        });
</script>

<div class="cover">
    <h1>திருக்குறள்</h1>
    <p>உலக பொதுமறை, பொய்யாமொழி, தெய்வநூல் என பொற்றபடும் திருக்குறளை கற்றுக்கொள்ளுங்கள்</p>
    <input placeholder="திருக்குறளைத் தேடுங்கள்" id="search">
</div>

<div class="content">
    {#if loaded.length == 0}
        <p class="tamil">சிறிது நேரம் காத்திருக்கவும்...</p>
    {:else}

        {#if withinKuralRange(requestedKural)}
            <div class="kural-box">
                <Kural 
                    kural={loaded[requestedKural - 1]} 
                    kuralEnn={requestedKural - 1}
                />
            </div>

            <div class="kural-box">
                <a href="/" class="taen">
                    <p class="tamil">முகப்புப் பக்கத்திற்குச் செல்ல வேண்டுமா?</p>
                    <p class="english"> Back to Homepage?</p>
                </a>
            </div>
        {:else if requestedKural}
            <div class="kural-box">
                <div class="tamil">குறள் எண் {requestedKural} திருக்குறளில் இல்லை</div>

                <a href="/" class="taen">
                    <p class="tamil">முகப்புப் பக்கத்திற்குச் செல்ல வேண்டுமா?</p>
                    <p class="english"> Back to Homepage?</p>
                </a>
            </div>
        {:else}
            <div class="kural-box">
                <Kural 
                    kural={loaded[dailyKuralNumber]} 
                    kuralEnn={dailyKuralNumber}
                />

                <!-- svelte-ignore a11y-missing-attribute -->
                <a class="kural-button" on:click={() => updateDailyKuralNumber(-1)}>முந்தைய குறள்</a>
                <!-- svelte-ignore a11y-missing-attribute -->
                <a class="kural-button" on:click={() => updateDailyKuralNumber(1)}>அடுத்த குறள்</a>
            </div>
        {/if}
    {/if}
</div>