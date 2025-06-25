# Swiss Health Insurance: Picking the Perfect Deductible

Switzerland’s health insurance system offers six deductible options (*franchises*), ranging from CHF 300 to CHF 2,500. But which one saves you the most money? 
Let’s cut through the noise and find out.

## The Big Reveal
**TL;DR**: Your average yearly health expenses over the past three years determine your best choice. 
If they’re *below ~CHF 2,000*, go for the **CHF 2,500 deductible** to slash your premiums. 
If they’re *above ~CHF 2,000*, pick the **CHF 300 deductible** to minimize total costs. 
The other four options? They’re just distractions that could cost you more.

## How We Know This
We’ve crunched the numbers using Python, NumPy, and Matplotlib to prove that only the extreme deductibles—CHF 300 and CHF 2,500—optimize your expenses 
(premiums + deductible + 10% co-insurance, capped at CHF 700 annually). 
The following chart below visualizes this, showing how your total costs depend on your health spending.
(The chart supposes data for a person born in 1984 living in Zurich.)

![image](https://github.com/user-attachments/assets/f8a177fa-0c18-47fb-8018-0c7861f4b433)

As you can see, if you have fewer expenses than 1,891 CHF, you'd better choose the highest deductible, 2,500 CHF.
Instead, if you have more expenses than 1,891 CHF per year, your best choice would be the 300 CHF deductible, even if the premiums cost more!

## Find Your Sweet Spot
To choose wisely, calculate your **average yearly health expenses**:
1. Gather your medical bills (doctor visits, hospital stays, prescriptions—not insurance premiums) from the last three years.
2. Sum them up and divide by 3 to get your annual average.

Now, compare this number to our findings:
- **Below ~CHF 2,000?** Choose the **CHF 2,500 deductible**. It comes with the lowest premiums, saving you money if your medical costs stay moderate.
You’ll pay up to CHF 2,500 out-of-pocket, plus up to CHF 700 in co-insurance.
- **Above ~CHF 2,000?** Opt for the **CHF 300 deductible**. Yes, premiums are higher, but you’ll only pay CHF 300 out-of-pocket before insurance kicks in, plus the CHF 700 co-insurance cap, keeping your total costs down when medical expenses soar.

## Why Only These Two?
The math is clear: intermediate deductibles (CHF 500, 1,000, 1,500, or 2,000) result in higher total costs because their premium savings don’t offset the out-of-pocket expenses as effectively as the extremes. Check out the calculations in the file `premium_chooser.ipynb` and chart above to see how we arrived at this insight.

Ready to save? Know your health costs, pick CHF 300 or CHF 2,500, and keep more money in your pocket!
