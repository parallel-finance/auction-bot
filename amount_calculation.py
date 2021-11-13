import json
from logger import logger

def load_json(file_path):
    with open(file_path, encoding='utf-8') as f:
        total_amount = 0
        ten_w_plus = 0
        fifty_w_plus = 0
        one_w_plus = 0
        line_cnt = 0
        while True:
            line = f.readline()
            if not line: # 到 EOF，返回空字符串，则终止循环
                break
            # js = json.loads(line)
            if 'amount' in line:
                rightstr=line.split(":")[1]
                amountStr=line.split("\"")[3]
                amount = int(amountStr) / 1e10
                if amount > 5000:
                    one_w_plus += 1
                if amount > 100000:
                    ten_w_plus += 1
                if amount > 500000:
                    fifty_w_plus += 1
                total_amount += amount
                # logger.info("line ==>>  {} ".format(line))
                # logger.info("amount ==>>  {} ".format(amount))
                # logger.info("total_amount ==>>  {} ".format(total_amount))
        logger.info("total amount ==>>  {} ".format(total_amount))
        logger.info("5k+ amount ==>>  {} ".format(one_w_plus))
        logger.info("10w+ amount ==>>  {} ".format(ten_w_plus))
        logger.info("50w+ amount ==>>  {} ".format(fifty_w_plus))

verified = '/home/rjman/repo/auction-bot/data_signed.json'
total_records = '/home/rjman/repo/auction-bot/data_total_records.json'
non_verified = '/home/rjman/repo/auction-bot/data_non_signed.json'
logger.info("signed:")
load_json(verified)
logger.info("total_records:")
load_json(total_records)
logger.info("non_verified:")
load_json(non_verified)