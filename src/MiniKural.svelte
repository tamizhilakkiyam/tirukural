<script>
    export let result;
</script>

<p class="tamil">குறள் {result.i + 1}</p>

{#each result.kural.li.split('\n') as ln}
    <p class="tamil kural-line">{ln}</p>
{/each}

<p class="english">{result.kural.tl}</p>